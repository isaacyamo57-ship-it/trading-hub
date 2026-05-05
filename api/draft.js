// Vercel serverless function: POST /api/draft
// Multi-provider: Anthropic, DeepSeek, OpenAI, Groq, Gemini
//
// Reads x-user-api-key + x-user-provider headers from the journal Settings.
// Falls back to ANTHROPIC_API_KEY env var if no user key is sent.

const { callAI, resolveProvider } = require('./_lib/aiProvider');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-api-key, x-user-provider');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { type, tradeContext, existingBias, existingNotes } = req.body || {};

    if (!type || !tradeContext) {
      res.status(400).json({ error: 'Missing required fields: type and tradeContext' });
      return;
    }

    const { provider, apiKey, source } = resolveProvider(req);

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

    const draft = await callAI({
      provider: provider,
      apiKey: apiKey,
      system: systemPrompt,
      user: userMsg,
      maxTokens: 600
    });

    if (!draft || !draft.trim()) {
      res.status(500).json({ error: 'No draft returned from model' });
      return;
    }

    res.status(200).json({ draft: draft.trim(), provider: provider });
  } catch (err) {
    console.error('Draft handler error:', err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Server error',
      detail: err.detail || String(err)
    });
  }
};
