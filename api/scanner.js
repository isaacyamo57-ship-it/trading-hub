const https = require('https');

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

const ICT_SYSTEM_PROMPT = `You are Isaac's personal ICT trading assistant. You score NQ futures setups using his exact rules.

STRATEGY RULES:
- Instrument: NQ E-mini NASDAQ-100 ($20/point, $5/tick)
- Trading window: NYAM ONLY — 8:30–11:00 AM New York time. Reject anything outside.
- Methodology: ICT (Inner Circle Trader) + Dodgydd Inversion Candle Closure Rating

BIAS (all three timeframes must agree):
- 4H: price respecting/tapping FVG from below (bullish) or above (bearish)? MSS or CISD formed? HH/HL = bullish, LH/LL = bearish
- 1H: same checks, must agree with 4H
- 15M: same checks, must agree with 4H + 1H
- If any disagree → grade cannot exceed B+. If all disagree → SKIP, grade F.

A+ SETUP SEQUENCE (all must be true):
1. 4H + 1H + 15M bias aligned
2. Inside NYAM killzone (8:30–11:00 AM NY)
3. Liquidity sweep confirmed (stop hunt of equal highs or equal lows)
4. Price tapped FVG → IFVG forming
5. MSS or CISD candle CLOSED (never mid-candle)
6. Minimum 2 ICT confluences stacked

ICT CONCEPTS:
- FVG: 3-candle imbalance, price will return to fill
- IFVG: filled FVG that flips — becomes support (was bearish FVG) or resistance (was bullish FVG)
- MSS: price breaks and CLOSES above swing high (bullish) or below swing low (bearish)
- CISD: first crack in structure before full MSS — earliest confirmation
- Liquidity sweep: price clears equal highs (buyside) or equal lows (sellside) then reverses
- LRLR: Low Resistance Liquidity Run — clean price area, minimal wicks, price travels through to reach liquidity
- Data wicks: wicks extending beyond structure into untested areas
- Order Block: last opposing candle before major impulsive move

DODGYDD SCORING (calculate from raw candle data provided):
Score the MSS/CISD confirmation candle on three components:

Candle Strength (0–4):
- 4: body_pct >= 0.85 — clear strong momentum
- 3: body_pct >= 0.70 — good momentum
- 2: body_pct >= 0.50 — moderate
- 1: body_pct >= 0.30 — weak
- 0: body_pct < 0.30 — no momentum

Inversion Speed (0–3):
- 3: candles_to_invert == 1 — immediate, price inverted on this candle
- 2: candles_to_invert == 2 — quick
- 1: candles_to_invert <= 4 — slow
- 0: candles_to_invert > 4 — failed inversion

Risk to Reward Position (0–3):
- 3: close_vs_ifvg_edge >= 0.90 — candle closed right at inversion edge (best R:R)
- 2: close_vs_ifvg_edge >= 0.70 — close to edge
- 1: close_vs_ifvg_edge >= 0.50 — middle of zone
- 0: close_vs_ifvg_edge < 0.50 — closed far from edge (bad R:R)

Total Dodgydd Score = Strength + Speed + R:R (max 10)

GRADE SCALE:
- A+: score 10 AND full bias alignment AND all 6 steps complete
- A: score 9 AND full bias alignment
- A-: score 8 AND full bias alignment
- B+: score 7 OR partial bias (2 of 3 TFs aligned)
- B: score 6
- B- score 5
- C: score 3–4
- F: invalid setup (key level taken before candle closed, OR outside killzone, OR no bias)

VALID TARGETS (suggest in priority order):
1. LRLR zones (Low Resistance Liquidity Runs) — clean price with no wicks
2. Data wicks — untested wick extremes
3. Equal highs / equal lows — obvious liquidity pools
4. 15M FVG — sometimes valid

RISK RULES:
- Risk per trade: 0.5–1% of account
- Minimum R:R: 1:1.5 (prefer 1:2+)
- Max 2–3 trades per session
- Stop after 2 losses OR 2R profit

OUTPUT: Respond ONLY with this exact JSON, no markdown, no text outside the JSON:
{"grade":"A+","dodgydd_score":10,"dodgydd_breakdown":{"strength":4,"speed":3,"rr":3},"direction":"LONG","entry_zone":"17,452–17,460","stop":"17,438","target":"EQL 17,524","rr":2.3,"confluences":["4H bullish FVG respected","1H MSS confirmed","15M bias aligned","Sellside liquidity swept","NYAM killzone active"],"reason":"One sentence plain English explanation of why this is or isn't a trade.","action":"TAKE IT"}

Valid action values: "TAKE IT" (A/A+/A-), "CONSIDER" (B+), "SKIP" (B and below or invalid)`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!CLAUDE_KEY) { res.status(500).json({ error: 'ANTHROPIC_API_KEY missing' }); return; }
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_ANON_KEY missing' }); return; }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch(e) {
    res.status(400).json({ error: 'Invalid JSON payload' }); return;
  }

  const userPrompt = `Score this NQ setup:
Direction: ${payload.direction}
Killzone: ${payload.killzone} | NY Time: ${payload.ny_time} | Killzone Active: ${payload.killzone_active}
HTF Bias: ${payload.htf_bias}
Timeframes Aligned: ${JSON.stringify(payload.timeframes_aligned)}
Sweep Type: ${payload.sweep_type}
FVG Zone: ${JSON.stringify(payload.fvg_zone)}
MSS Confirmed: ${payload.mss_confirmed} | CISD Confirmed: ${payload.cisd_confirmed}
Candle Body %: ${payload.candle_body_pct}
Candle Wick Ratio: ${payload.candle_wick_ratio}
Candles to Invert: ${payload.candles_to_invert}
Close vs IFVG Edge: ${payload.close_vs_ifvg_edge}
Nearest Targets: ${JSON.stringify(payload.nearest_targets)}
Stop Level: ${payload.stop_level}
Timestamp: ${payload.timestamp}

Apply all ICT rules, calculate Dodgydd score from the candle data, and return the grade JSON.`;

  const claudeBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: ICT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });

  let analysis;
  try {
    const aiRes = await httpsPost(
      'api.anthropic.com', '/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(claudeBody)
      },
      claudeBody
    );

    let aiText = '';
    if (aiRes._raw) {
      try { const p = JSON.parse(aiRes._raw); aiText = p?.content?.[0]?.text || ''; } catch(e) { aiText = aiRes._raw; }
    } else {
      if (aiRes.error) { res.status(500).json({ error: 'Claude error: ' + JSON.stringify(aiRes.error) }); return; }
      aiText = aiRes?.content?.[0]?.text || '';
    }

    const first = aiText.indexOf('{');
    const last = aiText.lastIndexOf('}');
    if (first === -1 || last <= first) { res.status(500).json({ error: 'No JSON in Claude response' }); return; }
    analysis = JSON.parse(aiText.substring(first, last + 1));
  } catch(e) {
    res.status(500).json({ error: 'Claude call failed: ' + e.message }); return;
  }

  const row = {
    grade: analysis.grade,
    dodgydd_score: analysis.dodgydd_score,
    direction: analysis.direction,
    killzone: payload.killzone,
    ny_time: payload.ny_time,
    htf_bias: payload.htf_bias,
    timeframes_aligned: payload.timeframes_aligned,
    sweep_type: payload.sweep_type,
    fvg_zone: payload.fvg_zone,
    entry_zone: analysis.entry_zone,
    stop_level: payload.stop_level,
    target: analysis.target,
    rr: analysis.rr,
    confluences: analysis.confluences,
    reason: analysis.reason,
    action: analysis.action,
    candle_body_pct: payload.candle_body_pct,
    candle_wick_ratio: payload.candle_wick_ratio,
    candles_to_invert: payload.candles_to_invert,
    close_vs_ifvg_edge: payload.close_vs_ifvg_edge
  };

  const supabaseBody = JSON.stringify(row);
  try {
    await httpsPost(
      new URL(SUPABASE_URL).hostname,
      '/rest/v1/scanner_alerts',
      {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(supabaseBody)
      },
      supabaseBody
    );
  } catch(e) {
    console.error('Supabase write failed:', e.message);
  }

  res.status(200).json({ analysis, saved: true });
};
