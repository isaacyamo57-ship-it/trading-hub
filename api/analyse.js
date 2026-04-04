const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ error: 'Parse error' }); } });
    }).on('error', reject);
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const NEWS_KEY   = process.env.NEWS_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  if (!NEWS_KEY || !CLAUDE_KEY) {
    res.status(500).json({ error: 'API keys missing in Vercel environment variables.' });
    return;
  }

  // 1. Fetch live news
  const articles = []; const seen = new Set();
  try {
    const d = await httpsGet(`https://newsapi.org/v2/everything?q=nasdaq+federal+reserve+economy+stocks&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_KEY}`);
    if (d.articles) for (const a of d.articles) {
      if (!seen.has(a.title) && a.title && a.title !== '[Removed]') {
        seen.add(a.title);
        articles.push({ title: a.title, source: a.source?.name || 'Unknown', description: (a.description||'').substring(0,100) });
      }
    }
  } catch(e) {}

  const newsContext = articles.slice(0,15).map((a,i) => `${i+1}. [${a.source}] ${a.title}`).join('\n');

  const prompt = `You are an expert NQ futures ICT trader. Analyse current bias.
Time: ${new Date().toUTCString()}
News: ${newsContext || 'Use general knowledge.'}

Return ONLY this JSON structure filled with real analysis. No extra text. No markdown:
{"overall_bias":"Bullish","confidence":70,"summary":"Short 2-3 sentence summary.","news_articles_used":${articles.length},"timeframes":{"4H":{"bias":"Bullish","strength":70,"reason":"reason"},"1H":{"bias":"Bullish","strength":65,"reason":"reason"},"15M":{"bias":"Neutral","strength":50,"reason":"reason"}},"news_drivers":[{"headline":"headline","source":"source","impact":"Bearish","reason":"NQ impact","emoji":"📉"},{"headline":"headline2","source":"source2","impact":"Bullish","reason":"NQ impact","emoji":"📈"}],"key_levels":{"watch_above":["19850 - EQH"],"watch_below":["19200 - EQL"]},"session_bias":{"london":"Bullish","london_reason":"reason","nyam":"Bullish","nyam_reason":"reason","nypm":"Neutral","nypm_reason":"reason"},"trade_plan":[{"type":"bull","text":"bull idea"},{"type":"bear","text":"bear idea"},{"type":"warn","text":"risk"}],"macro_factors":{"fed_stance":"Hawkish","risk_sentiment":"Risk-Off","vix_tone":"Elevated","dollar_tone":"Strong"}}`;

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

    if (!aiText) { res.status(500).json({ error: 'Empty response from Claude.' }); return; }

    let analysis = null;
    const clean = aiText.replace(/```json|```/g,'').trim();
    try { analysis = JSON.parse(clean); } catch(e) {}
    if (!analysis) { const m = clean.match(/\{[\s\S]*\}/); if (m) try { analysis = JSON.parse(m[0]); } catch(e) {} }
    if (!analysis) { res.status(500).json({ error: 'Parse failed. Raw: ' + aiText.substring(0,300) }); return; }

    res.status(200).json({ analysis, articleCount: articles.length });
  } catch(e) {
    res.status(500).json({ error: 'Request failed: ' + e.message });
  }
}
