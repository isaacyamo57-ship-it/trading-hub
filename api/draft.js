// Vercel serverless function: POST /api/draft
// Generates ICT-style trade journal drafts.
//
// API key resolution (in order):
//   1. x-user-api-key header (user-supplied key from journal Settings)
//   2. ANTHROPIC_API_KEY env var (Vercel fallback)
//
// Deploy: drop this file at `api/draft.js` in your trading-hub repo, push to GitHub.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-api-key');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { type, tradeContext, existingBias, existingNotes } = req.body || {};

    if (!type || !tradeContext) {
      res.status(400).json({ error: 'Missing required fields: type and tradeContext' });
      return;
    }

    // Resolve API key: user-supplied (from journal Settings) > env var
    const userKey = req.headers['x-user-api-key'];
    const apiKey = (userKey && typeof userKey === 'string' && userKey.length > 0)
      ? userKey
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      res.status(500).json({
        error: 'No API key available',
        detail: 'Add a key in Settings → API Keys, or set ANTHROPIC_API_KEY env var on Vercel.'
      });
      return;
    }

    const systemPrompt = type === 'bias'
      ? 'You are an ICT 2022 trading journal assistant for an NQ futures trader. Generate a concise pre-trade bias and plan entry (3-6 lines) based on the trade data. Use ICT concepts: HTF bias, draw on liquidity, FVG, IFVG, displacement, MSS, CISD, EQH/EQL. Write in first person, past tense. Be specific and clinical. No fluff. Return only the journal text — no headings, no markdown, no preamble.'
      : 'You are an ICT 2022 trading journal assistant for an NQ futures trader. Generate a concise post-trade notes entry (4-8 lines) covering: what happened on the chart, execution quality, emotional state, and the key lesson. Reference any tagged mistakes and the actual result. Write in first person. Be honest and analytical — flag mistakes plainly. Return only the journal text — no headings, no markdown, no preamble.';

    const userMsg = 'Trade data:\n' + tradeContext
      + (type === 'notes' && existingBias ? '\n\nPre-trade bias the trader already wrote:\n' + existingBias : '')
      + (type === 'notes' && existingNotes ? '\n\nPartial notes already written:\n' + existingNotes : '');

    const apiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      console.error('Anthropic API error:', apiResp.status, errText);
      res.status(apiResp.status).json({ error: 'Anthropic API error', detail: errText });
      return;
    }

    const data = await apiResp.json();
    const draft = (data.content && data.content[0] && data.content[0].text)
      ? data.content[0].text.trim()
      : '';

    if (!draft) {
      res.status(500).json({ error: 'No draft returned from model' });
      return;
    }

    res.status(200).json({ draft: draft, model: data.model });
  } catch (err) {
    console.error('Draft handler error:', err);
    res.status(500).json({ error: 'Server error', detail: String(err && err.message || err) });
  }
};
