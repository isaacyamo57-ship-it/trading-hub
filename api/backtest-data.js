const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Invalid JSON')); } });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function yahooInterval(iv) {
  const map = { '1min': '1m', '5min': '5m', '15min': '15m', '30min': '30m', '1h': '60m' };
  return map[iv] || '5m';
}

const YAHOO_SYMBOL = 'NQ=F';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { date, interval = '5min', symbol } = req.query;
  if (!date) return res.status(400).json({ error: 'date param required' });

  const yahooIv = yahooInterval(interval);
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + YAHOO_SYMBOL +
    '?interval=' + yahooIv + '&range=1mo&includePrePost=false';

  try {
    const data = await fetchJson(url);
    const result = data.chart.result[0];
    if (!result) return res.status(404).json({ error: 'No data from Yahoo Finance' });

    const timestamps = result.timestamp || [];
    const q = result.indicators.quote[0] || {};

    const dayStart = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
    const dayEnd = dayStart + 86400;

    // Get candles for the selected day
    const dayCandles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      if (q.open[i] == null) continue;
      if (t >= dayStart && t < dayEnd) {
        dayCandles.push({ time: t, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i] });
      }
    }

    if (dayCandles.length === 0) {
      return res.status(404).json({ error: 'No candles for this date — market may be closed' });
    }

    // Add context bars (up to 50 before the day)
    const ctxBars = [];
    let ctxCount = 0;
    for (let i = timestamps.length - 1; i >= 0 && ctxCount < 50; i--) {
      const t = timestamps[i];
      if (q.open[i] == null) continue;
      if (t < dayStart && t >= dayStart - 86400) {
        ctxBars.unshift({ time: t, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i] });
        ctxCount++;
      }
    }

    const candles = ctxBars.concat(dayCandles);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ candles, count: candles.length, symbol: YAHOO_SYMBOL });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
