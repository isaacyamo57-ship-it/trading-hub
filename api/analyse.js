const https = require('https');
const http = require('http');

function fetchUrl(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    const req = lib.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'Mozilla/5.0 NQ-Bias-Engine/2.0', 'Accept': 'application/rss+xml, application/json, text/html, */*' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'POST', headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ _raw: data }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function parseRSS(xml, sourceName) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const item of itemMatches.slice(0, 6)) {
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   item.match(/<title>(.*?)<\/title>/))?.[1] || '';
    const clean = title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,'').trim();
    if (clean.length > 15) items.push({ title: clean, source: sourceName });
  }
  return items;
}

function parseRedditJSON(json, subreddit) {
  const items = [];
  try {
    const data = JSON.parse(json);
    const posts = data?.data?.children || [];
    for (const post of posts.slice(0, 5)) {
      const d = post.data;
      if (d.title && d.score > 50 && !d.over_18) {
        items.push({ title: d.title, source: `r/${subreddit}` });
      }
    }
  } catch(e) {}
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const NEWS_KEY   = process.env.NEWS_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  if (!NEWS_KEY || !CLAUDE_KEY) { res.status(500).json({ error: 'API keys missing.' }); return; }

  const articles = [];
  const seen = new Set();

  function addArticles(items) {
    for (const item of items) {
      const clean = item.title.trim();
      if (!seen.has(clean) && clean.length > 15 && clean !== '[Removed]') {
        seen.add(clean);
        articles.push({ title: clean, source: item.source });
      }
    }
  }

  // All sources in parallel
  await Promise.allSettled([

    // ── NewsAPI ──
    fetchUrl(`https://newsapi.org/v2/everything?q=nasdaq+federal+reserve+economy+stocks&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_KEY}`)
      .then(raw => {
        const d = JSON.parse(raw);
        if (d.articles) d.articles.forEach(a => addArticles([{ title: a.title, source: a.source?.name || 'NewsAPI' }]));
      }).catch(() => {}),

    // ── Bloomberg RSS ──
    fetchUrl('https://feeds.bloomberg.com/markets/news.rss')
      .then(xml => addArticles(parseRSS(xml, 'Bloomberg'))).catch(() => {}),

    // ── Reuters RSS ──
    fetchUrl('https://feeds.reuters.com/reuters/businessNews')
      .then(xml => addArticles(parseRSS(xml, 'Reuters'))).catch(() => {}),

    // ── CNBC RSS ──
    fetchUrl('https://www.cnbc.com/id/100727362/device/rss/rss.html')
      .then(xml => addArticles(parseRSS(xml, 'CNBC'))).catch(() => {}),

    // ── MarketWatch ──
    fetchUrl('https://feeds.marketwatch.com/marketwatch/topstories/')
      .then(xml => addArticles(parseRSS(xml, 'MarketWatch'))).catch(() => {}),

    // ── Benzinga RSS ──
    fetchUrl('https://www.benzinga.com/feeds/news')
      .then(xml => addArticles(parseRSS(xml, 'Benzinga'))).catch(() => {}),

    // ── WSJ Markets RSS ──
    fetchUrl('https://feeds.wsj.com/wsj/xml/rss/3_7085.xml')
      .then(xml => addArticles(parseRSS(xml, 'WSJ Markets'))).catch(() => {}),

    // ── Yahoo Finance RSS ──
    fetchUrl('https://finance.yahoo.com/news/rssindex')
      .then(xml => addArticles(parseRSS(xml, 'Yahoo Finance'))).catch(() => {}),

    // ── Investing.com RSS ──
    fetchUrl('https://www.investing.com/rss/news.rss')
      .then(xml => addArticles(parseRSS(xml, 'Investing.com'))).catch(() => {}),

    // ── FinancialJuice RSS ──
    fetchUrl('https://www.financialjuice.com/feed')
      .then(xml => addArticles(parseRSS(xml, 'FinancialJuice'))).catch(() => {}),

    // ── Nasdaq RSS ──
    fetchUrl('https://www.nasdaq.com/feed/rssoutbound?category=Markets')
      .then(xml => addArticles(parseRSS(xml, 'Nasdaq'))).catch(() => {}),

    // ── Reddit r/stocks ──
    fetchUrl('https://www.reddit.com/r/stocks/hot.json?limit=10')
      .then(json => addArticles(parseRedditJSON(json, 'stocks'))).catch(() => {}),

    // ── Reddit r/wallstreetbets ──
    fetchUrl('https://www.reddit.com/r/wallstreetbets/hot.json?limit=10')
      .then(json => addArticles(parseRedditJSON(json, 'wallstreetbets'))).catch(() => {}),

    // ── Reddit r/investing ──
    fetchUrl('https://www.reddit.com/r/investing/hot.json?limit=10')
      .then(json => addArticles(parseRedditJSON(json, 'investing'))).catch(() => {}),

    // ── Reddit r/Daytrading ──
    fetchUrl('https://www.reddit.com/r/Daytrading/hot.json?limit=8')
      .then(json => addArticles(parseRedditJSON(json, 'Daytrading'))).catch(() => {}),

  ]);

  const finalArticles = articles.slice(0, 35);
  const newsContext = finalArticles.map((a,i) => `${i+1}. [${a.source}] ${a.title}`).join('\n');

  const sources = [...new Set(finalArticles.map(a => a.source))].join(', ');

  const prompt = `You are an expert NQ (Nasdaq 100 futures) ICT trader doing a pre-session HTF bias analysis.
Time: ${new Date().toUTCString()}

LIVE NEWS — ${finalArticles.length} articles from: ${sources}

Headlines:
${newsContext || 'Use general market knowledge.'}

Using these real headlines plus ICT concepts (FVGs, MSS, CISD, liquidity sweeps, EQH/EQL, LRLR, Data Wick, inversion FVGs, displacement), give a full HTF bias analysis for NQ futures.

CRITICAL: Your response must start with { and end with }. No backticks. No markdown. No code blocks. No json prefix. Raw JSON only:
{"overall_bias":"Bullish","confidence":70,"summary":"3 sentence macro summary and NQ impact.","news_articles_used":${finalArticles.length},"timeframes":{"4H":{"bias":"Bullish","strength":70,"reason":"specific ICT + macro reason"},"1H":{"bias":"Bullish","strength":65,"reason":"specific reason"},"15M":{"bias":"Neutral","strength":50,"reason":"specific reason"}},"news_drivers":[{"headline":"actual headline","source":"source name","impact":"Bearish","reason":"why it affects NQ specifically","emoji":"📉"},{"headline":"headline2","source":"source2","impact":"Bullish","reason":"NQ impact","emoji":"📈"},{"headline":"headline3","source":"source3","impact":"Neutral","reason":"NQ impact","emoji":"📊"}],"key_levels":{"watch_above":["19850 - EQH liquidity"],"watch_below":["19200 - EQL discount FVG"]},"session_bias":{"london":"Bullish","london_reason":"reason","nyam":"Bullish","nyam_reason":"reason","nypm":"Neutral","nypm_reason":"reason"},"trade_plan":[{"type":"bull","text":"specific bull idea"},{"type":"bear","text":"specific bear idea"},{"type":"warn","text":"key risk"}],"macro_factors":{"fed_stance":"Hawkish","risk_sentiment":"Risk-Off","vix_tone":"Elevated","dollar_tone":"Strong"}}`;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    const aiRes = await httpsPost(
      'api.anthropic.com', '/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body) },
      body
    );

    let aiText = '';
    if (aiRes._raw) {
      try { const p = JSON.parse(aiRes._raw); aiText = p?.content?.[0]?.text || ''; } catch(e) {}
    } else {
      if (aiRes.error) { res.status(500).json({ error: 'Claude: ' + JSON.stringify(aiRes.error) }); return; }
      aiText = aiRes?.content?.[0]?.text || '';
    }

    if (!aiText) { res.status(500).json({ error: 'Empty response.' }); return; }

    let analysis = null;
    // Aggressively clean the response
    let clean = aiText;
    clean = clean.replace(/^[\s\S]*?(\{)/m, '{'); // Find first {
    clean = clean.replace(/\}[\s\S]*$/, '}'); // Cut after last }
    // Find the JSON object
    const m = aiText.match(/\{[\s\S]*\}/);
    if (m) { try { analysis = JSON.parse(m[0]); } catch(e) {} }
    if (!analysis) { try { analysis = JSON.parse(clean); } catch(e) {} }
    if (!analysis) { res.status(500).json({ error: 'Parse failed. Raw: ' + aiText.substring(0,300) }); return; }

    res.status(200).json({ analysis, articleCount: finalArticles.length, sources });
  } catch(e) {
    res.status(500).json({ error: 'Request failed: ' + e.message });
  }
}
