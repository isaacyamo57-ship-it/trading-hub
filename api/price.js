// Vercel serverless function: GET /api/price
// Live NQ futures price feed — server-side proxy with multi-source fallback.
//
// Why this exists:
//   - Yahoo Finance (query1.finance.yahoo.com) blocks browser CORS, so the
//     journal's old client-side fetch silently failed. We proxy server-side.
//   - Stooq is used as a fallback if Yahoo is down or rate-limits us.
//   - Edge cache (s-maxage=10) means even with heavy traffic Yahoo is
//     hit at most ~6x/min globally.
//
// Response shape:
//   {
//     symbol: "NQ=F",
//     price: 21504.25,
//     prevClose: 21450.00,
//     change: 54.25,
//     changePct: 0.2530,
//     marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" | "PREPRE" | "POSTPOST",
//     time: 1730000000,            // unix seconds, last trade time
//     currency: "USD",
//     exchange: "CME",
//     source: "yahoo" | "stooq",
//     stale: false                 // true if both primary and fallback failed
//   }
//
// Optional query: ?symbol=ES=F (defaults to NQ=F)

const https = require('https');

const DEFAULT_SYMBOL = 'NQ=F';
const TIMEOUT_MS = 4000;

function fetchUrl(url, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: Object.assign({
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
          'Accept': 'application/json, text/csv, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        }, opts.headers || {})
      }, (res) => {
        // Follow a single redirect if present
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && !opts._redirected) {
          res.resume();
          fetchUrl(new URL(res.headers.location, url).toString(), Object.assign({}, opts, { _redirected: true }))
            .then(resolve);
          return;
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', () => resolve({ status: 0, body: '' }));
      req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve({ status: 0, body: '' }); });
      req.end();
    } catch (e) {
      resolve({ status: 0, body: '' });
    }
  });
}

// ─── Source 1: Yahoo Finance chart API (primary) ───
async function fetchYahoo(symbol) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=1d`;
  const r = await fetchUrl(url);
  if (r.status !== 200 || !r.body) return null;
  let data;
  try { data = JSON.parse(r.body); } catch (_) { return null; }
  const result = data && data.chart && data.chart.result && data.chart.result[0];
  if (!result || !result.meta) return null;
  const m = result.meta;
  const price = Number(m.regularMarketPrice);
  // For futures, chartPreviousClose is the prior session's close — more stable
  // than previousClose (which can be the prior settlement price).
  const prev = Number(m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose);
  if (!isFinite(price) || !isFinite(prev) || price <= 0 || prev <= 0) return null;
  const change = price - prev;
  return {
    symbol: m.symbol || symbol,
    price,
    prevClose: prev,
    change,
    changePct: prev > 0 ? (change / prev) * 100 : 0,
    marketState: m.marketState || 'UNKNOWN',
    time: m.regularMarketTime || Math.floor(Date.now() / 1000),
    currency: m.currency || 'USD',
    exchange: m.exchangeName || m.fullExchangeName || 'CME',
    source: 'yahoo'
  };
}

// ─── Source 2: Stooq CSV (fallback, ~15min delayed but reliable) ───
// Symbol mapping: NQ=F → nq.f, ES=F → es.f, etc.
function stooqSymbol(yahooSym) {
  return String(yahooSym).toLowerCase().replace('=f', '.f');
}

async function fetchStooq(symbol) {
  const ssym = stooqSymbol(symbol);
  const url = `https://stooq.com/q/l/?s=${ssym}&f=sd2t2ohlcv&h&e=csv`;
  const r = await fetchUrl(url);
  if (r.status !== 200 || !r.body) return null;
  // CSV format: Symbol,Date,Time,Open,High,Low,Close,Volume
  // Sample:    NQ.F,2026-05-05,17:30:00,21500,21520,21480,21504.25,12345
  const lines = r.body.trim().split('\n');
  if (lines.length < 2) return null;
  const cols = lines[1].split(',');
  if (cols.length < 7) return null;
  const close = Number(cols[6]);
  const open = Number(cols[3]);
  if (!isFinite(close) || close <= 0) return null;
  // Stooq doesn't return prev close in this endpoint, so use open as a rough
  // proxy for intraday change. This is approximate — only used if Yahoo dies.
  const prev = isFinite(open) && open > 0 ? open : close;
  const change = close - prev;
  // Parse date+time as ET, return unix seconds
  let time = Math.floor(Date.now() / 1000);
  try {
    const dt = new Date((cols[1] + 'T' + cols[2] + 'Z').replace(/\s+/g, ''));
    if (!isNaN(dt.getTime())) time = Math.floor(dt.getTime() / 1000);
  } catch (_) { /* keep now */ }
  return {
    symbol,
    price: close,
    prevClose: prev,
    change,
    changePct: prev > 0 ? (change / prev) * 100 : 0,
    marketState: 'UNKNOWN',
    time,
    currency: 'USD',
    exchange: 'CME',
    source: 'stooq'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const symbol = (req.query && req.query.symbol) ? String(req.query.symbol).slice(0, 12) : DEFAULT_SYMBOL;

  // Edge cache: 10s fresh, serve stale up to 60s while revalidating.
  // Means Yahoo is hit at most ~6x/min globally regardless of traffic.
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');

  // Try Yahoo first, then Stooq.
  let quote = null;
  let errors = [];
  try {
    quote = await fetchYahoo(symbol);
    if (!quote) errors.push('yahoo:empty');
  } catch (e) {
    errors.push('yahoo:' + (e.message || 'err'));
  }
  if (!quote) {
    try {
      quote = await fetchStooq(symbol);
      if (!quote) errors.push('stooq:empty');
    } catch (e) {
      errors.push('stooq:' + (e.message || 'err'));
    }
  }

  if (!quote) {
    res.status(502).json({ error: 'All price sources failed', tried: errors, symbol });
    return;
  }

  // Round to sensible precision (NQ trades in 0.25 ticks)
  quote.price = Math.round(quote.price * 100) / 100;
  quote.prevClose = Math.round(quote.prevClose * 100) / 100;
  quote.change = Math.round(quote.change * 100) / 100;
  quote.changePct = Math.round(quote.changePct * 10000) / 10000;
  quote.stale = false;
  quote.fetchedAt = Math.floor(Date.now() / 1000);

  res.status(200).json(quote);
};
