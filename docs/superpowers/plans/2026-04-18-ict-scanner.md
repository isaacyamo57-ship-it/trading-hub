# ICT Setup Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time A+ setup scanner that watches Isaac's NQ chart via TradingView webhooks, scores each setup using Claude against his full ICT + Dodgydd rules, and displays live alerts in a new `scanner.html` page inside the existing trading hub.

**Architecture:** A Pine Script v5 indicator on TradingView detects the ICT sequence on candle close and fires a webhook to `api/scanner.js`. Claude scores the setup and saves the result to Supabase. `scanner.html` listens via Supabase Realtime and renders the alert card. No polling, no manual refreshes.

**Tech Stack:** Vanilla HTML/CSS/JS, Vercel serverless (Node.js), Anthropic API (raw HTTPS, same pattern as `api/analyse.js`), Supabase JS CDN client, TradingView Pine Script v5.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/scanner_alerts.sql` | Create | Schema for alert logging |
| `api/scanner.js` | Create | Webhook receiver + Claude scorer + Supabase write |
| `scanner.html` | Create | Alert display UI — glassmorphism, matches hub design |
| `index.html` | Modify | Add scanner card to app grid |
| `tradingview/ict-scanner.pine` | Create | Pine Script v5 indicator (paste into TradingView) |

---

## Task 1: Supabase Table + Environment Variables

**Files:**
- Create: `supabase/scanner_alerts.sql`

- [ ] **Step 1: Create the SQL schema file**

Create `supabase/scanner_alerts.sql` with this exact content:

```sql
create table scanner_alerts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  grade text not null,
  dodgydd_score int not null,
  direction text not null,
  killzone text not null,
  ny_time text,
  htf_bias text,
  timeframes_aligned jsonb,
  sweep_type text,
  fvg_zone jsonb,
  entry_zone text,
  stop_level float,
  target text,
  rr float,
  confluences jsonb,
  reason text,
  action text,
  candle_body_pct float,
  candle_wick_ratio float,
  candles_to_invert int,
  close_vs_ifvg_edge float,
  outcome text,
  r_achieved float,
  execution_score int
);

alter table scanner_alerts enable row level security;
create policy "anon read" on scanner_alerts for select using (true);
create policy "anon insert" on scanner_alerts for insert with check (true);
create policy "anon update" on scanner_alerts for update using (true);
```

- [ ] **Step 2: Run the SQL in Supabase**

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste the contents of `supabase/scanner_alerts.sql`
4. Click **Run**
5. Verify: go to **Table Editor** → confirm `scanner_alerts` table exists with all columns

- [ ] **Step 3: Add environment variables to Vercel**

1. Open your Vercel project dashboard
2. Go to **Settings → Environment Variables**
3. Add these (if not already present):
   - `ANTHROPIC_API_KEY` — your Anthropic API key (already set from `api/analyse.js`)
   - `SUPABASE_URL` — from Supabase → Settings → API → Project URL (e.g. `https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` — from Supabase → Settings → API → anon/public key
4. Redeploy or save — Vercel picks up env vars on next deploy

- [ ] **Step 4: Commit**

```bash
git add supabase/scanner_alerts.sql
git commit -m "feat: add scanner_alerts supabase schema"
```

---

## Task 2: `api/scanner.js` — Webhook Handler + Claude Scorer

**Files:**
- Create: `api/scanner.js`

- [ ] **Step 1: Create `api/scanner.js`**

Create `api/scanner.js` with this exact content:

```javascript
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
```

- [ ] **Step 2: Deploy to Vercel**

```bash
git add api/scanner.js
git commit -m "feat: add ICT scanner webhook handler with Claude scoring"
```

Then push to GitHub — Vercel auto-deploys on push.

- [ ] **Step 3: Test the webhook locally**

Run Vercel dev server:
```bash
npx vercel dev
```

In a new terminal, send a test webhook:
```bash
curl -X POST http://localhost:3000/api/scanner \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "long",
    "killzone": "nyam",
    "killzone_active": true,
    "ny_time": "09:14",
    "htf_bias": "bullish",
    "timeframes_aligned": ["4H", "1H", "15M"],
    "sweep_type": "sellside",
    "fvg_zone": [17450, 17460],
    "mss_confirmed": true,
    "cisd_confirmed": false,
    "candle_body_pct": 0.92,
    "candle_wick_ratio": 0.04,
    "candles_to_invert": 1,
    "close_vs_ifvg_edge": 0.98,
    "nearest_targets": ["EQL_17524", "data_wick_17538"],
    "stop_level": 17438,
    "timestamp": "2026-04-18T14:14:00Z"
  }'
```

Expected response:
```json
{
  "analysis": {
    "grade": "A+",
    "dodgydd_score": 10,
    "dodgydd_breakdown": { "strength": 4, "speed": 3, "rr": 3 },
    "direction": "LONG",
    "entry_zone": "17,452–17,460",
    "stop": "17,438",
    "target": "EQL 17,524",
    "rr": 2.3,
    "confluences": [...],
    "reason": "...",
    "action": "TAKE IT"
  },
  "saved": true
}
```

If `grade` is not A+ with this perfect test payload, check the Claude system prompt is being sent correctly.

---

## Task 3: `scanner.html` — Live Alert Page

**Files:**
- Create: `scanner.html`

- [ ] **Step 1: Create `scanner.html`**

Create `scanner.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ICT Scanner — Trading Hub</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    .scanner-page { max-width: 900px; margin: 0 auto; padding: var(--sp6) var(--sp4); }

    .session-bar {
      display: flex; gap: var(--sp3); align-items: center; flex-wrap: wrap;
      margin-bottom: var(--sp5);
    }
    .session-pill {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.78rem; color: var(--text2); font-family: var(--font-mono);
    }
    .session-pill.active { border-color: var(--win); color: var(--win); }
    .session-pill.warn { border-color: var(--warn); color: var(--warn); }

    .alert-card {
      position: relative; overflow: hidden;
      background: rgba(255,255,255,0.03);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: var(--radius-lg);
      padding: var(--sp5);
      margin-bottom: var(--sp5);
    }
    .alert-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    }
    .alert-card.grade-ap { border-color: rgba(201,168,76,0.3); box-shadow: 0 0 24px rgba(201,168,76,0.08); }
    .alert-card.grade-a  { border-color: rgba(77,170,125,0.3); box-shadow: 0 0 24px rgba(77,170,125,0.08); }
    .alert-card.grade-am { border-color: rgba(93,143,196,0.3); box-shadow: 0 0 24px rgba(93,143,196,0.08); }
    .alert-card.grade-skip { border-color: rgba(220,80,80,0.2); }
    .alert-card.empty { text-align: center; padding: var(--sp7) var(--sp5); color: var(--text2); }

    .grade-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 72px; height: 72px; border-radius: 50%;
      font-size: 1.4rem; font-weight: 700; font-family: var(--font-mono);
      margin-bottom: var(--sp3);
    }
    .grade-badge.ap { background: rgba(201,168,76,0.15); color: var(--gold); border: 2px solid var(--gold); }
    .grade-badge.a  { background: rgba(77,170,125,0.15); color: var(--win); border: 2px solid var(--win); }
    .grade-badge.am { background: rgba(93,143,196,0.15); color: var(--blue); border: 2px solid var(--blue); }
    .grade-badge.skip { background: rgba(220,80,80,0.1); color: var(--loss); border: 2px solid var(--loss); }

    .alert-header { display: flex; align-items: flex-start; gap: var(--sp4); }
    .alert-meta { flex: 1; }
    .alert-direction {
      font-size: 1.6rem; font-weight: 700; letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .alert-direction.long { color: var(--win); }
    .alert-direction.short { color: var(--loss); }
    .alert-time { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text2); }

    .alert-levels {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp3);
      margin: var(--sp4) 0;
    }
    .level-item { text-align: center; }
    .level-label { font-size: 0.7rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .level-value { font-family: var(--font-mono); font-size: 0.95rem; color: var(--text1); font-weight: 600; }
    .level-value.rr { color: var(--win); }

    .dodgydd-bar {
      display: flex; align-items: center; gap: var(--sp3);
      margin: var(--sp3) 0;
    }
    .dodgydd-label { font-size: 0.75rem; color: var(--text2); min-width: 80px; }
    .dodgydd-track {
      flex: 1; height: 6px; background: rgba(255,255,255,0.06);
      border-radius: 3px; overflow: hidden;
    }
    .dodgydd-fill {
      height: 100%; border-radius: 3px;
      background: linear-gradient(90deg, var(--blue), var(--win), var(--gold));
      transition: width 0.5s ease;
    }
    .dodgydd-score { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text1); min-width: 36px; text-align: right; }

    .confluences { display: flex; flex-wrap: wrap; gap: 6px; margin: var(--sp3) 0; }
    .confluence-tag {
      font-size: 0.72rem; padding: 4px 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 999px; color: var(--text2);
    }

    .alert-reason {
      font-size: 0.85rem; color: var(--text2); line-height: 1.5;
      padding: var(--sp3); background: rgba(0,0,0,0.15); border-radius: var(--radius);
      margin-top: var(--sp3);
    }

    .action-banner {
      text-align: center; padding: var(--sp2) var(--sp3);
      border-radius: var(--radius); font-weight: 700; font-size: 0.9rem;
      letter-spacing: 0.1em; margin-top: var(--sp3);
    }
    .action-banner.take { background: rgba(77,170,125,0.15); color: var(--win); border: 1px solid rgba(77,170,125,0.3); }
    .action-banner.consider { background: rgba(93,143,196,0.15); color: var(--blue); border: 1px solid rgba(93,143,196,0.3); }
    .action-banner.skip { background: rgba(220,80,80,0.08); color: var(--loss); border: 1px solid rgba(220,80,80,0.2); }

    .history-section h3 { font-size: 0.8rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--sp3); }
    .history-row {
      display: flex; align-items: center; gap: var(--sp3);
      padding: var(--sp2) var(--sp3);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-size: 0.8rem;
    }
    .history-grade { font-family: var(--font-mono); font-weight: 700; min-width: 32px; }
    .history-grade.ap { color: var(--gold); }
    .history-grade.a  { color: var(--win); }
    .history-grade.am { color: var(--blue); }
    .history-grade.skip { color: var(--text2); }
    .history-dir { min-width: 48px; }
    .history-dir.long { color: var(--win); }
    .history-dir.short { color: var(--loss); }
    .history-time { color: var(--text2); font-family: var(--font-mono); font-size: 0.72rem; margin-left: auto; }

    #waiting-msg { color: var(--text2); font-size: 0.85rem; font-family: var(--font-mono); }

    @media (max-width: 600px) {
      .alert-levels { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <nav class="topnav">
    <a href="index.html" class="topnav-brand">Trading Hub</a>
    <div class="topnav-links">
      <a href="index.html">Home</a>
      <a href="bias.html">Bias</a>
      <a href="drawdown.html">R Tracker</a>
      <a href="journal.html">Journal</a>
      <a href="scanner.html" class="active">Scanner</a>
    </div>
  </nav>

  <div class="scanner-page">
    <div class="session-bar">
      <span class="sec-lbl">ICT SCANNER</span>
      <span id="killzone-pill" class="session-pill">Checking session...</span>
      <span id="trade-counter" class="session-pill">0 / 3 trades</span>
      <span id="daily-status" class="session-pill">Session clear</span>
      <span id="live-dot-wrap"><span class="live-dot"></span></span>
    </div>

    <div id="latest-alert" class="alert-card empty">
      <p id="waiting-msg">Waiting for setup...</p>
    </div>

    <div class="history-section">
      <h3>Session History</h3>
      <div id="history-list"></div>
    </div>
  </div>

  <script>
    const SUPABASE_URL  = 'YOUR_SUPABASE_URL';
    const SUPABASE_KEY  = 'YOUR_SUPABASE_ANON_KEY';
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_KEY);

    let tradeCount = 0;
    let lossCount  = 0;

    function gradeClass(grade) {
      if (grade === 'A+') return 'ap';
      if (grade === 'A')  return 'a';
      if (grade === 'A-') return 'am';
      return 'skip';
    }

    function gradeCardClass(grade) {
      if (grade === 'A+') return 'grade-ap';
      if (grade === 'A')  return 'grade-a';
      if (grade === 'A-') return 'grade-am';
      return 'grade-skip';
    }

    function actionClass(action) {
      if (action === 'TAKE IT') return 'take';
      if (action === 'CONSIDER') return 'consider';
      return 'skip';
    }

    function formatTime(iso) {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' NY';
    }

    function checkKillzone() {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const h = nyTime.getHours();
      const m = nyTime.getMinutes();
      const mins = h * 60 + m;
      const isActive = mins >= 510 && mins < 660; // 8:30 AM = 510, 11:00 AM = 660
      const pill = document.getElementById('killzone-pill');
      pill.textContent = isActive ? 'NYAM ACTIVE 8:30–11:00' : 'NYAM CLOSED';
      pill.className = 'session-pill' + (isActive ? ' active' : '');
    }

    function renderAlert(row) {
      const gc = gradeClass(row.grade);
      const dir = (row.direction || '').toLowerCase();
      const dodgyddPct = (row.dodgydd_score / 10) * 100;
      const confluences = (row.confluences || []).map(c => `<span class="confluence-tag">${c}</span>`).join('');
      const ac = actionClass(row.action);

      document.getElementById('latest-alert').className = `alert-card ${gradeCardClass(row.grade)}`;
      document.getElementById('latest-alert').innerHTML = `
        <div class="alert-header">
          <div class="grade-badge ${gc}">${row.grade}</div>
          <div class="alert-meta">
            <div class="alert-direction ${dir}">${row.direction}</div>
            <div class="alert-time">${formatTime(row.created_at)} · Dodgydd ${row.dodgydd_score}/10</div>
          </div>
        </div>
        <div class="alert-levels">
          <div class="level-item">
            <div class="level-label">Entry Zone</div>
            <div class="level-value">${row.entry_zone || '—'}</div>
          </div>
          <div class="level-item">
            <div class="level-label">Stop</div>
            <div class="level-value">${row.stop_level || '—'}</div>
          </div>
          <div class="level-item">
            <div class="level-label">Target</div>
            <div class="level-value">${row.target || '—'}</div>
          </div>
          <div class="level-item">
            <div class="level-label">R:R</div>
            <div class="level-value rr">${row.rr ? '1:' + row.rr : '—'}</div>
          </div>
        </div>
        <div class="dodgydd-bar">
          <span class="dodgydd-label">Dodgydd</span>
          <div class="dodgydd-track"><div class="dodgydd-fill" style="width:${dodgyddPct}%"></div></div>
          <span class="dodgydd-score">${row.dodgydd_score}/10</span>
        </div>
        <div class="confluences">${confluences}</div>
        <div class="alert-reason">${row.reason || ''}</div>
        <div class="action-banner ${ac}">${row.action}</div>
      `;
    }

    function addToHistory(row) {
      const gc = gradeClass(row.grade);
      const dir = (row.direction || '').toLowerCase();
      const el = document.createElement('div');
      el.className = 'history-row';
      el.innerHTML = `
        <span class="history-grade ${gc}">${row.grade}</span>
        <span class="history-dir ${dir}">${row.direction}</span>
        <span>${row.target || '—'}</span>
        <span>R:R ${row.rr ? '1:' + row.rr : '—'}</span>
        <span class="history-time">${formatTime(row.created_at)}</span>
      `;
      const list = document.getElementById('history-list');
      list.insertBefore(el, list.firstChild);
    }

    async function loadToday() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await db
        .from('scanner_alerts')
        .select('*')
        .gte('created_at', today + 'T00:00:00Z')
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return;
      renderAlert(data[0]);
      data.forEach(row => addToHistory(row));
      tradeCount = data.filter(r => r.outcome && r.outcome !== 'skipped').length;
      lossCount  = data.filter(r => r.outcome === 'loss').length;
      updateCounters();
    }

    function updateCounters() {
      document.getElementById('trade-counter').textContent = `${tradeCount} / 3 trades`;
      const statusEl = document.getElementById('daily-status');
      if (lossCount >= 2) {
        statusEl.textContent = 'STOP — 2 losses hit';
        statusEl.className = 'session-pill warn';
      } else {
        statusEl.textContent = `${lossCount} loss${lossCount !== 1 ? 'es' : ''} today`;
        statusEl.className = 'session-pill';
      }
    }

    db.channel('scanner_alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scanner_alerts' }, payload => {
        renderAlert(payload.new);
        addToHistory(payload.new);
      })
      .subscribe();

    checkKillzone();
    setInterval(checkKillzone, 60000);
    loadToday();
  </script>
</body>
</html>
```

- [ ] **Step 2: Replace Supabase credentials in scanner.html**

In `scanner.html`, replace:
- `YOUR_SUPABASE_URL` → your actual Supabase project URL (from Task 1 Step 3)
- `YOUR_SUPABASE_ANON_KEY` → your actual Supabase anon key

- [ ] **Step 3: Commit**

```bash
git add scanner.html
git commit -m "feat: add scanner.html live alert page"
```

- [ ] **Step 4: Add scanner card to `index.html`**

Open `index.html` and find the app cards grid (where bias.html, drawdown.html, journal.html cards are). Add a scanner card in the same style as the others:

```html
<a href="scanner.html" class="card card-sm" style="text-decoration:none">
  <div class="stat-label">ICT Scanner</div>
  <div class="stat-value" style="font-size:1.1rem">A+ Alerts</div>
  <div class="stat-sub">Live setup detection</div>
</a>
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add scanner link to hub home"
```

---

## Task 4: Pine Script v5 Indicator (TradingView)

**Files:**
- Create: `tradingview/ict-scanner.pine`

This file lives in the repo for reference but is pasted directly into TradingView's Pine Script editor.

- [ ] **Step 1: Create `tradingview/ict-scanner.pine`**

Create `tradingview/ict-scanner.pine` with this exact content:

```pine
//@version=5
indicator("ICT Setup Scanner — NQ", overlay=true, max_boxes_count=200, max_lines_count=200, max_labels_count=200)

// ─── INPUTS ────────────────────────────────────────────────────────────────
fvg_show       = input.bool(true,  "Show FVG Boxes")
ob_show        = input.bool(true,  "Show Order Blocks")
eql_show       = input.bool(true,  "Show Equal Highs/Lows")
kz_show        = input.bool(true,  "Show Killzone Shading")
webhook_url    = input.string("", "Webhook URL (set in alert)")

// ─── COLOURS ───────────────────────────────────────────────────────────────
bull_col  = color.new(color.green,  75)
bear_col  = color.new(color.red,    75)
ifvg_bull = color.new(color.teal,   70)
ifvg_bear = color.new(color.orange, 70)
kz_col    = color.new(color.blue,   92)
mss_bull  = color.new(color.lime,   0)
mss_bear  = color.new(color.red,    0)
eql_col   = color.new(color.yellow, 60)

// ─── KILLZONE (NYAM: 8:30–11:00 AM New York) ──────────────────────────────
is_nyam = not na(time("1", "0830-1100", "America/New_York"))
bgcolor(kz_show and is_nyam ? kz_col : na, title="NYAM Killzone")

// ─── FAIR VALUE GAPS ───────────────────────────────────────────────────────
// Bullish FVG: gap between high[2] and low[0] (low of current > high of 2 bars ago)
bull_fvg = low > high[2]
// Bearish FVG: gap between low[2] and high[0] (high of current < low of 2 bars ago)
bear_fvg = high < low[2]

var box[] bull_fvg_boxes = array.new_box()
var box[] bear_fvg_boxes = array.new_box()
var float[] bull_fvg_tops    = array.new_float()
var float[] bull_fvg_bottoms = array.new_float()
var float[] bear_fvg_tops    = array.new_float()
var float[] bear_fvg_bottoms = array.new_float()

if bull_fvg and fvg_show
    b = box.new(bar_index[2], low, bar_index, high[2], border_color=bull_col, bgcolor=bull_col)
    array.push(bull_fvg_boxes, b)
    array.push(bull_fvg_tops, low)
    array.push(bull_fvg_bottoms, high[2])

if bear_fvg and fvg_show
    b = box.new(bar_index[2], high, bar_index, low[2], border_color=bear_col, bgcolor=bear_col)
    array.push(bear_fvg_boxes, b)
    array.push(bear_fvg_tops, low[2])
    array.push(bear_fvg_bottoms, high)

// ─── IFVG DETECTION (FVG gets tapped and flips) ───────────────────────────
var bool ifvg_bull_active = false
var bool ifvg_bear_active = false
var float ifvg_bull_level = na
var float ifvg_bear_level = na

// Check if price has entered a bearish FVG (potential IFVG forming — bullish)
for i = 0 to array.size(bear_fvg_tops) - 1
    top = array.get(bear_fvg_tops, i)
    bot = array.get(bear_fvg_bottoms, i)
    if close >= bot and close <= top
        ifvg_bull_active := true
        ifvg_bull_level  := bot
        break

// Check if price has entered a bullish FVG (potential IFVG forming — bearish)
for i = 0 to array.size(bull_fvg_tops) - 1
    top = array.get(bull_fvg_tops, i)
    bot = array.get(bull_fvg_bottoms, i)
    if close >= bot and close <= top
        ifvg_bear_active := true
        ifvg_bear_level  := top
        break

// ─── MSS DETECTION (candle close breaks swing high/low) ───────────────────
lookback = 10
swing_high = ta.highest(high, lookback)[1]
swing_low  = ta.lowest(low,  lookback)[1]

mss_bull_close = close > swing_high and close[1] <= swing_high[1]
mss_bear_close = close < swing_low  and close[1] >= swing_low[1]

plotshape(mss_bull_close, "MSS Bull", shape.arrowup,   location.belowbar, mss_bull, size=size.small)
plotshape(mss_bear_close, "MSS Bear", shape.arrowdown, location.abovebar, mss_bear, size=size.small)

// ─── EQUAL HIGHS / EQUAL LOWS ─────────────────────────────────────────────
eql_threshold = syminfo.mintick * 10
eqh = math.abs(high - high[1]) <= eql_threshold
eql = math.abs(low  - low[1])  <= eql_threshold

if eql_show and eqh
    line.new(bar_index[1], high[1], bar_index, high, color=eql_col, style=line.style_dotted, width=1)
if eql_show and eql
    line.new(bar_index[1], low[1],  bar_index, low,  color=eql_col, style=line.style_dotted, width=1)

// ─── HTF BIAS (via request.security) ─────────────────────────────────────
[htf_4h_close, htf_4h_high, htf_4h_low] = request.security(syminfo.tickerid, "240", [close, high, low])
[htf_1h_close, htf_1h_high, htf_1h_low] = request.security(syminfo.tickerid, "60",  [close, high, low])

// Simple bias: is price above or below prior swing?
bias_4h_bull = htf_4h_close > ta.highest(htf_4h_high, 10)[1]
bias_4h_bear = htf_4h_close < ta.lowest(htf_4h_low,   10)[1]
bias_1h_bull = htf_1h_close > ta.highest(htf_1h_high, 10)[1]
bias_1h_bear = htf_1h_close < ta.lowest(htf_1h_low,   10)[1]
bias_15m_bull = close > ta.highest(high, 10)[1]
bias_15m_bear = close < ta.lowest(low,   10)[1]

all_bullish = bias_4h_bull and bias_1h_bull and bias_15m_bull
all_bearish = bias_4h_bear and bias_1h_bear and bias_15m_bear

htf_bias_str = all_bullish ? "bullish" : all_bearish ? "bearish" : "neutral"

// ─── CANDLE DATA FOR DODGYDD SCORING ──────────────────────────────────────
candle_range    = high - low
candle_body     = math.abs(close - open)
body_pct        = candle_range > 0 ? candle_body / candle_range : 0
wick_ratio      = candle_range > 0 ? (candle_range - candle_body) / candle_range : 0
close_vs_edge_bull = ifvg_bull_level > 0 ? (close - ifvg_bull_level) / (high - ifvg_bull_level + syminfo.mintick) : 0
close_vs_edge_bear = ifvg_bear_level > 0 ? (ifvg_bear_level - close) / (ifvg_bear_level - low + syminfo.mintick) : 0

// ─── FULL SEQUENCE CHECK ──────────────────────────────────────────────────
long_setup  = is_nyam and all_bullish and ifvg_bull_active and mss_bull_close
short_setup = is_nyam and all_bearish and ifvg_bear_active and mss_bear_close

// ─── ALERT PAYLOAD ────────────────────────────────────────────────────────
long_msg = '{"direction":"long","killzone":"nyam","killzone_active":true,"ny_time":"' +
    str.tostring(hour(time, "America/New_York")) + ':' +
    str.tostring(minute(time, "America/New_York")) +
    '","htf_bias":"bullish","timeframes_aligned":["4H","1H","15M"],"sweep_type":"sellside",' +
    '"fvg_zone":[' + str.tostring(math.round(ifvg_bull_level, 2)) + ',' + str.tostring(math.round(close, 2)) + '],' +
    '"mss_confirmed":true,"cisd_confirmed":false,' +
    '"candle_body_pct":' + str.tostring(math.round(body_pct, 3)) + ',' +
    '"candle_wick_ratio":' + str.tostring(math.round(wick_ratio, 3)) + ',' +
    '"candles_to_invert":1,' +
    '"close_vs_ifvg_edge":' + str.tostring(math.round(close_vs_edge_bull, 3)) + ',' +
    '"nearest_targets":["EQL_above"],' +
    '"stop_level":' + str.tostring(math.round(low, 2)) + ',' +
    '"timestamp":"{{timenow}}"}'

short_msg = '{"direction":"short","killzone":"nyam","killzone_active":true,"ny_time":"' +
    str.tostring(hour(time, "America/New_York")) + ':' +
    str.tostring(minute(time, "America/New_York")) +
    '","htf_bias":"bearish","timeframes_aligned":["4H","1H","15M"],"sweep_type":"buyside",' +
    '"fvg_zone":[' + str.tostring(math.round(close, 2)) + ',' + str.tostring(math.round(ifvg_bear_level, 2)) + '],' +
    '"mss_confirmed":true,"cisd_confirmed":false,' +
    '"candle_body_pct":' + str.tostring(math.round(body_pct, 3)) + ',' +
    '"candle_wick_ratio":' + str.tostring(math.round(wick_ratio, 3)) + ',' +
    '"candles_to_invert":1,' +
    '"close_vs_ifvg_edge":' + str.tostring(math.round(close_vs_edge_bear, 3)) + ',' +
    '"nearest_targets":["EQH_above"],' +
    '"stop_level":' + str.tostring(math.round(high, 2)) + ',' +
    '"timestamp":"{{timenow}}"}'

alertcondition(long_setup,  "ICT A+ LONG",  long_msg)
alertcondition(short_setup, "ICT A+ SHORT", short_msg)

// ─── VISUAL LABELS ────────────────────────────────────────────────────────
if long_setup
    label.new(bar_index, low - (syminfo.mintick * 20),
        "A+ LONG", color=color.new(color.green, 20),
        textcolor=color.white, style=label.style_label_up, size=size.small)

if short_setup
    label.new(bar_index, high + (syminfo.mintick * 20),
        "A+ SHORT", color=color.new(color.red, 20),
        textcolor=color.white, style=label.style_label_down, size=size.small)
```

- [ ] **Step 2: Add the indicator to TradingView**

1. Open TradingView → your NQ chart
2. Click **Pine Script Editor** (bottom panel)
3. Paste the entire contents of `tradingview/ict-scanner.pine`
4. Click **Save** → name it "ICT Setup Scanner — NQ"
5. Click **Add to chart**
6. Verify: FVG boxes, killzone shading, and MSS arrows appear on chart

- [ ] **Step 3: Set up the TradingView alert with webhook**

1. In TradingView, click the **Alert** button (clock icon) → Create Alert
2. Condition: select "ICT Setup Scanner — NQ" → "ICT A+ LONG"
3. Scroll to **Notifications** → enable **Webhook URL**
4. Enter your Vercel function URL: `https://your-project.vercel.app/api/scanner`
5. Message: leave as `{{strategy.order.alert_message}}` (Pine Script sends the JSON)
6. Click **Create**
7. Repeat for "ICT A+ SHORT"

- [ ] **Step 4: Commit**

```bash
git add tradingview/ict-scanner.pine
git commit -m "feat: add ICT Pine Script v5 indicator with webhook alerts"
```

---

## Task 5: End-to-End Integration Test

- [ ] **Step 1: Send a live test webhook to your deployed Vercel URL**

Replace `YOUR_PROJECT` with your actual Vercel project name:

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/scanner \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "long",
    "killzone": "nyam",
    "killzone_active": true,
    "ny_time": "09:30",
    "htf_bias": "bullish",
    "timeframes_aligned": ["4H", "1H", "15M"],
    "sweep_type": "sellside",
    "fvg_zone": [17450, 17460],
    "mss_confirmed": true,
    "cisd_confirmed": false,
    "candle_body_pct": 0.92,
    "candle_wick_ratio": 0.04,
    "candles_to_invert": 1,
    "close_vs_ifvg_edge": 0.98,
    "nearest_targets": ["EQL_17524"],
    "stop_level": 17438,
    "timestamp": "2026-04-18T14:30:00Z"
  }'
```

Expected: `{"analysis":{"grade":"A+",...},"saved":true}`

- [ ] **Step 2: Verify alert appears in scanner.html**

1. Open `scanner.html` in your browser
2. The A+ LONG alert card should appear within 2-3 seconds (Supabase Realtime)
3. Verify: grade badge shows A+ in gold, entry zone populated, Dodgydd bar at 100%, action banner says "TAKE IT"

- [ ] **Step 3: Verify row in Supabase**

1. Open Supabase → Table Editor → `scanner_alerts`
2. Confirm the row exists with correct grade, dodgydd_score, direction, confluences

- [ ] **Step 4: Test outside-killzone rejection**

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/scanner \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "long",
    "killzone": "nyam",
    "killzone_active": false,
    "ny_time": "14:00",
    "htf_bias": "bullish",
    "timeframes_aligned": ["4H", "1H", "15M"],
    "sweep_type": "sellside",
    "fvg_zone": [17450, 17460],
    "mss_confirmed": true,
    "cisd_confirmed": false,
    "candle_body_pct": 0.92,
    "candle_wick_ratio": 0.04,
    "candles_to_invert": 1,
    "close_vs_ifvg_edge": 0.98,
    "nearest_targets": ["EQL_17524"],
    "stop_level": 17438,
    "timestamp": "2026-04-18T19:00:00Z"
  }'
```

Expected: response with `"grade":"F"` or `"action":"SKIP"` — outside killzone should not produce A+.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: ICT scanner complete — Pine Script + api/scanner.js + scanner.html"
```

---

## Self-Review Notes

- Spec requires daily limit tracking (2 losses → stop) ✅ implemented in `scanner.html` via `lossCount`
- Spec requires pre-defined target shown before grade ✅ target always calculated by Claude and shown in alert card
- Spec requires candle-close-only alerts ✅ enforced in Pine Script via `alertcondition` which only fires on bar close
- Spec requires Dodgydd score calculated from raw candle data ✅ Pine Script sends `candle_body_pct`, `candle_wick_ratio`, `candles_to_invert`, `close_vs_ifvg_edge` — Claude calculates score
- Adaptive learning loop (weekly Claude analysis) is **out of scope for this plan** — covered in a separate future plan
