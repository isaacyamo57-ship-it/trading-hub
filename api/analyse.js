const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const lib = url.startsWith('https') ? https : require('http');
      const req = lib.get({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: { 'User-Agent': 'Mozilla/5.0 NQ-Bias-Engine/2.0', 'Accept': '*/*' }
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(4000, () => { req.destroy(); resolve(''); });
    } catch(e) { resolve(''); }
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

function parseRSS(xml, source) {
  const items = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const item of matches.slice(0, 5)) {
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '';
    const clean = title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,'').trim();
    if (clean.length > 15) items.push({ title: clean, source });
  }
  return items;
}

function parseReddit(json, sub) {
  const items = [];
  try {
    const data = JSON.parse(json);
    for (const p of (data?.data?.children || []).slice(0, 5)) {
      if (p.data.title && p.data.score > 30 && !p.data.over_18)
        items.push({ title: p.data.title, source: `r/${sub}` });
    }
  } catch(e) {}
  return items;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-api-key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const NEWS_KEY    = process.env.NEWS_API_KEY;
  const PERIGON_KEY = process.env.PERIGON_API_KEY;

  // Resolve Anthropic API key: user-supplied (from journal Settings) > env var
  const userKey = req.headers['x-user-api-key'];
  const CLAUDE_KEY = (userKey && typeof userKey === 'string' && userKey.length > 0)
    ? userKey
    : process.env.ANTHROPIC_API_KEY;

  if (!CLAUDE_KEY) {
    res.status(500).json({ error: 'No API key available. Add a key in Journal → Settings → API Keys, or set ANTHROPIC_API_KEY env var on Vercel.' });
    return;
  }

  const articles = [];
  const seen = new Set();
  function add(items) {
    for (const item of items) {
      const t = (item.title || '').trim();
      if (!seen.has(t) && t.length > 15 && t !== '[Removed]') {
        seen.add(t);
        articles.push({ title: t, source: item.source });
      }
    }
  }

  await Promise.allSettled([
    NEWS_KEY && fetchUrl(`https://newsapi.org/v2/everything?q=nasdaq+federal+reserve+economy+stocks&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_KEY}`)
      .then(raw => { try { const d=JSON.parse(raw); if(d.articles) d.articles.forEach(a=>add([{title:a.title,source:a.source?.name||'NewsAPI'}])); } catch(e){} }),
    PERIGON_KEY && fetchUrl(`https://api.perigon.io/v1/all?q=nasdaq+futures+federal+reserve&language=en&sortBy=date&size=10&apiKey=${PERIGON_KEY}`)
      .then(raw => { try { const d=JSON.parse(raw); if(d.articles) d.articles.forEach(a=>add([{title:a.title,source:'Perigon'}])); } catch(e){} }),
    fetchUrl('https://feeds.bloomberg.com/markets/news.rss').then(xml=>add(parseRSS(xml,'Bloomberg'))),
    fetchUrl('https://feeds.reuters.com/reuters/businessNews').then(xml=>add(parseRSS(xml,'Reuters'))),
    fetchUrl('https://www.cnbc.com/id/100727362/device/rss/rss.html').then(xml=>add(parseRSS(xml,'CNBC'))),
    fetchUrl('https://feeds.marketwatch.com/marketwatch/topstories/').then(xml=>add(parseRSS(xml,'MarketWatch'))),
    fetchUrl('https://feeds.wsj.com/wsj/xml/rss/3_7085.xml').then(xml=>add(parseRSS(xml,'WSJ Markets'))),
    fetchUrl('https://finance.yahoo.com/news/rssindex').then(xml=>add(parseRSS(xml,'Yahoo Finance'))),
    fetchUrl('https://www.benzinga.com/feeds/news').then(xml=>add(parseRSS(xml,'Benzinga'))),
    fetchUrl('https://www.financialjuice.com/feed').then(xml=>add(parseRSS(xml,'FinancialJuice'))),
    fetchUrl('https://www.nasdaq.com/feed/rssoutbound?category=Markets').then(xml=>add(parseRSS(xml,'Nasdaq'))),
    fetchUrl('https://www.reddit.com/r/stocks/hot.json?limit=10').then(j=>add(parseReddit(j,'stocks'))),
    fetchUrl('https://www.reddit.com/r/wallstreetbets/hot.json?limit=10').then(j=>add(parseReddit(j,'wallstreetbets'))),
    fetchUrl('https://www.reddit.com/r/investing/hot.json?limit=10').then(j=>add(parseReddit(j,'investing'))),
    fetchUrl('https://www.reddit.com/r/Daytrading/hot.json?limit=8').then(j=>add(parseReddit(j,'Daytrading'))),
  ]);

  const finalArticles = articles.slice(0, 30);
  const newsContext = finalArticles.map((a,i) => `${i+1}. [${a.source}] ${a.title}`).join('\n');
  const sources = [...new Set(finalArticles.map(a => a.source))].join(', ');

  const userPrompt = `Analyse NQ futures HTF bias. Time: ${new Date().toUTCString()}
News (${finalArticles.length} articles from ${sources}):
${newsContext.substring(0, 1800)}

Output ONLY this JSON object, nothing else:
{"overall_bias":"Bullish","confidence":70,"summary":"2 sentences on macro and NQ bias.","news_articles_used":${finalArticles.length},"session_score":7,"best_session":"NY AM","best_session_reason":"one line reason why","sentiment_breakdown":{"bullish_pct":60,"bearish_pct":25,"neutral_pct":15},"risk_meters":{"tariff_risk":"High","geopolitical_risk":"Medium","fed_risk":"Low","overall_risk":"Medium"},"correlations":{"dollar":"Bearish for NQ","vix":"Elevated - caution","tech_sector":"Strong - supports NQ","bonds":"Neutral"},"timeframes":{"4H":{"bias":"Bullish","strength":72,"reason":"one line"},"1H":{"bias":"Bullish","strength":65,"reason":"one line"},"15M":{"bias":"Neutral","strength":50,"reason":"one line"}},"news_drivers":[{"headline":"real headline from news","source":"source name","impact":"Bullish","reason":"NQ impact","emoji":"📈"},{"headline":"real headline 2","source":"source","impact":"Bearish","reason":"NQ impact","emoji":"📉"},{"headline":"real headline 3","source":"source","impact":"Neutral","reason":"NQ impact","emoji":"📊"}],"key_levels":{"watch_above":["19850 - EQH"],"watch_below":["19200 - EQL"]},"session_bias":{"london":"Bullish","london_reason":"one line","nyam":"Bullish","nyam_reason":"one line","nypm":"Neutral","nypm_reason":"one line"},"trade_plan":[{"type":"bull","text":"specific long idea"},{"type":"bear","text":"specific short idea"},{"type":"warn","text":"main risk today"}],"macro_factors":{"fed_stance":"Hawkish","risk_sentiment":"Risk-Off","vix_tone":"Elevated","dollar_tone":"Strong"}}`;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: 'You are an expert NQ futures ICT trader. You ONLY output raw JSON. Never use markdown, backticks, or any text outside the JSON. Your entire response must be a single valid JSON object starting with { and ending with }. Never truncate the JSON.',
    messages: [{ role: 'user', content: userPrompt }]
  });

  try {
    const aiRes = await httpsPost(
      'api.anthropic.com', '/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      },
      body
    );

    let aiText = '';
    if (aiRes._raw) {
      try { const p = JSON.parse(aiRes._raw); aiText = p?.content?.[0]?.text || ''; } catch(e) { aiText = aiRes._raw; }
    } else {
      if (aiRes.error) { res.status(500).json({ error: 'Claude error: ' + JSON.stringify(aiRes.error), detail: JSON.stringify(aiRes.error) }); return; }
      aiText = aiRes?.content?.[0]?.text || '';
    }

    if (!aiText) { res.status(500).json({ error: 'Empty response from Claude.' }); return; }

    let analysis = null;
    const first = aiText.indexOf('{');
    const last = aiText.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try { analysis = JSON.parse(aiText.substring(first, last + 1)); } catch(e) {}
    }
    if (!analysis) {
      try { analysis = JSON.parse(aiText.replace(/```json/gi,'').replace(/```/g,'').trim()); } catch(e) {}
    }
    if (!analysis) {
      res.status(500).json({ error: 'Parse failed. Raw: ' + aiText.substring(0, 400) });
      return;
    }

    res.status(200).json({ analysis, articleCount: finalArticles.length, sources });

  } catch(e) {
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
}
