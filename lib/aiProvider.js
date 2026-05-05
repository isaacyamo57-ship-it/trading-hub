// api/_lib/aiProvider.js
// Shared multi-provider AI router. Used by /api/draft and /api/analyse.
//
// Usage:
//   const { callAI } = require('./_lib/aiProvider');
//   const text = await callAI({ provider, apiKey, system, user, maxTokens, jsonOnly });

const https = require('https');

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Resolve provider + key from request headers, with env-var fallback
function resolveProvider(req) {
  const userKey = req.headers['x-user-api-key'];
  const userProvider = (req.headers['x-user-provider'] || '').toLowerCase();
  if (userKey && typeof userKey === 'string' && userKey.length > 0) {
    return {
      provider: userProvider || 'anthropic',
      apiKey: userKey,
      source: 'user'
    };
  }
  // Fallback to env var (Anthropic only — that's how the system was set up originally)
  return {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    source: 'env'
  };
}

async function callAI({ provider, apiKey, system, user, maxTokens = 1000, jsonOnly = false }) {
  if (!apiKey) throw new Error('No API key provided');

  switch (provider) {
    case 'anthropic': return callAnthropic({ apiKey, system, user, maxTokens });
    case 'deepseek':  return callOpenAICompat({ apiKey, system, user, maxTokens, jsonOnly, host: 'api.deepseek.com',  model: 'deepseek-chat' });
    case 'openai':    return callOpenAICompat({ apiKey, system, user, maxTokens, jsonOnly, host: 'api.openai.com',    model: 'gpt-4o-mini' });
    case 'groq':      return callOpenAICompat({ apiKey, system, user, maxTokens, jsonOnly, host: 'api.groq.com',      path: '/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' });
    case 'gemini':    return callGemini({ apiKey, system, user, maxTokens });
    default: throw new Error('Unknown provider: ' + provider);
  }
}

// ── Anthropic ──
async function callAnthropic({ apiKey, system, user, maxTokens }) {
  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: system,
    messages: [{ role: 'user', content: user }]
  });
  const { status, body: rb } = await httpsRequest({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (status !== 200) throw makeProviderError('Anthropic', status, rb);
  const data = JSON.parse(rb);
  return data?.content?.[0]?.text || '';
}

// ── OpenAI-compatible (DeepSeek, OpenAI, Groq) ──
async function callOpenAICompat({ apiKey, system, user, maxTokens, jsonOnly, host, path, model }) {
  const payload = {
    model: model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
  if (jsonOnly) payload.response_format = { type: 'json_object' };
  const body = JSON.stringify(payload);
  const { status, body: rb } = await httpsRequest({
    hostname: host,
    path: path || '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (status !== 200) throw makeProviderError(host, status, rb);
  const data = JSON.parse(rb);
  return data?.choices?.[0]?.message?.content || '';
}

// ── Google Gemini ──
async function callGemini({ apiKey, system, user, maxTokens }) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
  });
  // gemini-2.0-flash is the current free-tier model with generous limits
  const { status, body: rb } = await httpsRequest({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(apiKey),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (status !== 200) throw makeProviderError('Gemini', status, rb);
  const data = JSON.parse(rb);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function makeProviderError(provider, status, body) {
  const err = new Error(provider + ' error (' + status + '): ' + (body || '').substring(0, 400));
  err.status = status;
  err.detail = body;
  return err;
}

module.exports = { callAI, resolveProvider };
