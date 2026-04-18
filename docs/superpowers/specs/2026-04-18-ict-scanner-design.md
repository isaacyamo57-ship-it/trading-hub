# ICT Setup Scanner — Design Spec
**Date:** 2026-04-18  
**Trader:** Isaac — Intraday NQ Futures, Bletchley UK  
**Account:** Apex Trader Funding (live funded)  
**Instrument:** NQ E-mini NASDAQ-100 ($20/point, $5/tick)

---

## Overview

A two-monitor trading assistant built entirely around Isaac's personal ICT + Dodgydd methodology. A Pine Script indicator draws all ICT levels on TradingView. When the full A+ sequence fires on candle close, a webhook alerts a Vercel serverless function, Claude scores the setup against Isaac's exact rules, and a grade appears in a new `scanner.html` page inside the existing trading hub. Every alert is logged to Supabase. Claude runs a weekly analysis to learn which setups work specifically for Isaac over time.

---

## Trader's Strategy (Source of Truth for Claude)

### Methodology
ICT (Inner Circle Trader) + Dodgydd Inversion Candle Closure Rating System

### Trading Window
**NYAM only:** 8:30–11:00 AM New York time (13:30–16:00 BST)  
No London session. No NY lunch. No exceptions.

### Bias Determination (Top-Down, All Three Must Agree)

| Timeframe | What to Check |
|-----------|--------------|
| 4H | Is price respecting/tapping a FVG from below (bullish) or above (bearish)? Has an MSS or CISD formed? Are we making HH/HL (bullish) or LH/LL (bearish)? |
| 1H | Same checks as 4H. Must agree with 4H direction. |
| 15M | Same checks. FVG respect in line with 4H + 1H adds conviction. |

- **All three agree bullish** → Bullish bias → longs only
- **All three agree bearish** → Bearish bias → shorts only
- **Disagreement** → Neutral → no trades

### ICT Concepts Used

| Concept | Definition |
|---------|-----------|
| FVG (Fair Value Gap) | Three-candle imbalance — price moved too fast, left an inefficiency it will return to fill |
| IFVG (Inverse FVG) | A filled FVG that flips — becomes support (was bearish) or resistance (was bullish) on the next visit |
| Order Block (OB) | Last opposing candle before a major impulsive move — origin of institutional orders |
| MSS (Market Structure Shift) | Price breaks a recent swing high or low on candle close — genuine change in direction |
| CISD (Change in State of Delivery) | Earliest signal of structure change — first crack in prevailing delivery before a full MSS |
| Liquidity Sweep | Deliberate stop-hunt move — price clears equal highs (buyside) or equal lows (sellside) before reversing |
| Equal Highs / Equal Lows | Pools of resting stop orders above/below aligned swing points — primary liquidity targets |
| Premium / Discount | Buy in lower 50% of range (discount). Sell in upper 50% (premium). |
| Draw on Liquidity (DOL) | The narrative — where is price engineered to go and why |
| LRLR (Low Resistance Liquidity Run) | Clean price area with minimal resistance — price travels through it on the way to a liquidity target |
| Data Wicks | Wicks that extend beyond structure into untested areas — valid targets |
| NWOG / NDOG | New Week / New Day Opening Gaps — institutional reference levels at session opens |

### A+ Setup Sequence (All 7 Steps Must Complete in Order)

1. **HTF bias confirmed** — 4H + 1H + 15M all agree (bullish or bearish)
2. **Inside NYAM killzone** — 8:30–11:00 AM New York time
3. **Liquidity sweep confirmed** — price hunts stops above EQH (bearish) or below EQL (bullish)
4. **Price taps FVG** — enters fair value gap in direction of bias
5. **IFVG begins to form** — tapped FVG starts to invert
6. **MSS or CISD candle CLOSES** — structure shift confirmed on close (**never mid-candle**)
7. **Dodgydd score calculated** — inversion candle rated 0–10

> **Critical rule:** Isaac never enters before the MSS/CISD candle fully closes. This rule directly addresses his March 2026 losses — all three traced back to entering without confirmation or a pre-defined target.

### Dodgydd Inversion Candle Closure Rating

The MSS/CISD confirmation candle (Step 6) is scored using Dodgydd's framework:

| Component | Max | What it Measures |
|-----------|-----|-----------------|
| Candle Strength | 4 | How strong and clear the momentum candle is |
| Inversion Speed | 3 | How quickly price responds and fills the FVG |
| Risk to Reward | 3 | How close the candle closes to the inversion edge |
| **Total** | **10** | |

| Grade | Score | Description |
|-------|-------|-------------|
| A+ | 10/10 | Strength 4/4, Speed 3/3, R:R 3/3 — immediate strong response at edge |
| A | 9/10 | Strength 4/4, high speed and R:R |
| A- | 8/10 | Strength 4/4, slightly lower speed or R:R |
| B+ | 7/10 | Candle strength varies (2–3/4) |
| B | 6/10 | Weak strength (1–2/4) |
| B- | 5/10 | Weak strength, slow inversion |
| C | 3–4/10 | Low probability across all components |
| F | 0/10 | Invalid — key level taken before candle closes |

**A trade without bias confirmation cannot be graded A or A+.**

### Confirmation Timeframes (Entry Execution)
1M, 2M, 3M, 5M

### Entry Model
**IFVG only.** Place limit order into the IFVG zone after MSS/CISD candle closes. Stop beyond the candle extreme that invalidates the thesis. **Pre-defined profit target must be written before the order goes live — non-negotiable.**

### Valid Targets (in priority order)
1. LRLR (Low Resistance Liquidity Run zones)
2. Data wicks
3. Equal highs / equal lows
4. 15M FVG (sometimes)

### Risk Management
- Risk per trade: 0.5–1% of account
- Minimum R:R: 1:1.5 (preference 1:2 or better)
- Position management: 50% off at 1R, run remainder to full target
- Max trades per day: 2–3
- **Daily stop rules: stop after 2 losses OR after reaching 2R profit**

### Minimum Confluence Requirement
At least 2 ICT factors must stack. A lone FVG outside killzone = not a trade.

---

## System Architecture

### Part 1 — Pine Script v5 Indicator (TradingView)

**What it draws on the NQ chart:**

| Element | Visual |
|---------|--------|
| FVG boxes (bullish/bearish) | Green/red shaded boxes |
| IFVG | Box colour changes when FVG gets tapped and flips |
| Equal highs / equal lows | Dotted horizontal lines |
| MSS arrows | Up/down arrow on candle close |
| CISD labels | Text label on close |
| Order Blocks | Outlined boxes |
| NYAM killzone | Blue background tint 8:30–11:00 AM NY |
| Asia range | Dashed high/low lines carried forward |
| LRLR zones | Highlighted clean price areas |

**Fires webhook on candle CLOSE only when all 7 steps are confirmed.**

**Webhook payload:**
```json
{
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
}
```

**TradingView plan required:** Essential (webhooks confirmed available)

---

### Part 2 — Vercel Serverless Function (`api/scanner.js`)

Receives webhook → builds Claude prompt with Isaac's full ruleset → returns grade + entry details.

**Claude model:** `claude-haiku-4-5` (fast, cheap, same as `api/analyse.js`)  
**Prompt caching:** enabled on system prompt (Isaac's strategy rules) — reduces cost ~90% after first call

**Claude output:**
```json
{
  "grade": "A+",
  "dodgydd_score": 10,
  "direction": "LONG",
  "entry_zone": "17,452–17,460",
  "stop": "17,438",
  "target": "EQL 17,524",
  "rr": 2.3,
  "confluences": [
    "4H bullish FVG respected",
    "1H MSS confirmed",
    "15M bias aligned",
    "Sellside liquidity swept",
    "NYAM killzone active"
  ],
  "reason": "Full bias alignment across all three timeframes. Clean sellside sweep into IFVG. Strong MSS candle close. Dodgydd 10/10 — strength 4/4, immediate inversion, closed at edge.",
  "action": "TAKE IT"
}
```

**Grades that trigger alerts:** A+, A, A-  
**Grades that are logged but suppressed:** B+, B, B-, C  
**Invalid setups (F):** discarded, not logged

---

### Part 3 — Scanner Page (`scanner.html`)

New page added to trading hub. Matches existing glassmorphism design system (same CSS variables, `.glass`, `.card`, orb backgrounds).

**Layout:**
- Top: session status bar (NYAM active/inactive, daily trade counter, daily P&L)
- Centre: latest alert card — grade badge (gold A+, green A, blue A-), direction, entry/stop/target, R:R, Dodgydd score, confluences list, Claude's plain-English reason
- Bottom: session alert history (all alerts this session, scrollable)

**Grade badge colours:**
- A+ → `--orb-gold` (gold)
- A → `--orb-win` (green)
- A- → `--orb-blue` (blue)
- SKIP → loss red

---

### Part 4 — Adaptive Learning Loop (Supabase)

**Table: `scanner_alerts`**

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| timestamp | timestamptz | |
| grade | text | A+, A, A-, B+... |
| dodgydd_score | int | 0–10 |
| direction | text | long/short |
| timeframes_aligned | jsonb | which TFs agreed |
| confluences | jsonb | list of factors |
| entry_zone | jsonb | high/low |
| stop | float | |
| target | text | |
| rr_planned | float | |
| outcome | text | win/loss/be/skipped — added by Isaac after trade |
| r_achieved | float | actual R — added after trade |
| execution_score | int | 1–10 — added after trade |

**Weekly analysis (every Sunday, auto-triggered via Vercel cron):**

Claude reads the last 7 days of `scanner_alerts` where outcome is filled in. Returns a plain-English performance report:
- Win rate by grade (A+ vs A vs A-)
- Win rate by target type (LRLR vs EQH/EQL vs data wicks)
- Win rate by time of day within NYAM
- Execution score vs outcome correlation
- One actionable recommendation

Report displayed on `scanner.html` in a collapsible weekly review card.

---

## File Structure

```
trading-hub/
├── scanner.html              ← new page
├── api/
│   ├── scanner.js            ← new: webhook receiver + Claude scorer
│   ├── scanner-weekly.js     ← new: Sunday cron analysis
│   ├── analyse.js            ← existing (unchanged)
│   └── calendar.js           ← existing (unchanged)
├── styles.css                ← existing (scanner.html uses same vars)
└── supabase/
    └── scanner_alerts.sql    ← new: table schema
```

---

## Cost Estimate

| Item | Cost |
|------|------|
| TradingView Essential (webhooks) | Already paying |
| Claude API (~10 alerts/day, Haiku + caching) | ~$0.40–0.50/month |
| Supabase | Free tier (existing) |
| Vercel | Free tier (existing) |
| **Total new cost** | **~$0.50/month** |

---

## Non-Negotiable Rules Enforced by the System

1. No alert fires outside 8:30–11:00 AM NY time
2. No alert fires mid-candle — webhook only on close
3. No A/A+ grade without all three bias timeframes aligned
4. No valid setup without minimum 2 ICT confluences
5. Pre-defined target always calculated and shown before grade is displayed
6. Daily limit tracked — scanner shows warning at 2 losses or 2R profit reached

---

## Out of Scope (This Version)

- Automated trade execution (this is an alert system only — Isaac pulls the trigger)
- London session support
- Multi-instrument support (NQ only)
- Mobile app (trading hub is desktop)
- Broker API integration
