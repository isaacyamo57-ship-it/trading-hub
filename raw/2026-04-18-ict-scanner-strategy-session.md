# ICT Setup Scanner — Strategy Session (2026-04-18)

## Trader Profile

Isaac is an intraday NQ futures trader based in Bletchley, UK, operating a live Apex Trader Funding account. He trades exclusively the E-mini NASDAQ-100 Futures contract (NQ), worth $20 per point and $5 per tick, using the ICT (Inner Circle Trader) methodology.

## Core ICT Methodology

### Key Concepts Used
- **Fair Value Gap (FVG)**: Three-candle imbalance where price moved too fast and left an inefficiency it will return to fill
- **Inverse FVG (IFVG)**: Previously filled gap that flips and becomes support or resistance on the next visit
- **Order Block (OB)**: Last opposing candle before a major impulsive move, representing the origin of institutional orders
- **Market Structure Shift (MSS)**: Moment price breaks a recent swing high or low, signalling a genuine change in direction
- **Change of Character (CHoCH) / Change In State of Delivery (CISD)**: Earliest signal of a potential MSS, the first crack in prevailing structure
- **Buy-Side and Sell-Side Liquidity**: Pools of resting stop orders above equal highs and below equal lows that price is engineered to sweep before reversing
- **Liquidity Sweeps**: Deliberate stop-hunt moves that clear out retail traders before the real move begins
- **Premium and Discount Arrays**: Buy in lower 50% of range (discount), sell in upper 50% (premium)
- **New Week and New Day Opening Gaps (NWOG/NDOG)**: Institutional reference levels formed at the open of a new session
- **Draw on Liquidity (DOL)**: The narrative — where is price actually going and why

## Multi-Timeframe Analysis Stack

| Timeframe | Purpose |
|-----------|---------|
| Weekly / Daily | Overall bias, nearest significant DOL |
| 4H / 1H | Map Premium/Discount arrays, FVGs, IFVGs, OBs, structural levels |
| 15M / 5M | Watch for setup sequence, pattern validation |
| 1M / 2M / 3M / 5M | Entry execution timeframes |

## Session Structure (BST)

| Time | Session |
|------|---------|
| 00:00–06:00 | Asia session — range building, liquidity accumulation. Mark Asia high/low |
| 06:00 | Morning prep: study Asia range, build top-down analysis |
| 07:00–10:00 | **London Open Killzone** — PRIMARY trading window (highest probability) |
| 13:30–16:00 | **New York Open Killzone** — SECONDARY trading window |
| 16:00–17:30 | NY lunch dead zone — AVOID (volume dies, price chops) |

## A+ Setup Sequence (Complete)

A valid setup requires this exact sequence to complete in order:

1. **HTF bias established** — Weekly/Daily direction confirmed
2. **Inside killzone** — London (07:00–10:00) or NY (13:30–16:00) BST
3. **Liquidity sweep confirmed** — Price hunts stops above equal highs or below equal lows
4. **Price taps FVG** — Enters fair value gap zone
5. **FVG inverts to IFVG** — Gap begins to flip
6. **MSS or CISD candle CLOSES** — Structure shift confirmed on close (NOT mid-candle)
7. **Score inversion candle** using Dodgydd framework
8. **Alert fires** with entry zone, stop, target, R:R

> Critical rule: Isaac WAITS for the MSS or CISD candle to fully CLOSE before entering. No mid-candle entries. This rule directly addresses his March 2026 losses which were caused by entering without a pre-defined target or waiting for confirmation.

## Confluence Requirements

Minimum 2 ICT confluences required per setup:
- 15M FVG inside H1 Order Block during London killzone with HTF bias aligned = HIGH CONVICTION
- Lone FVG outside killzone = NOT a trade

## Targets

- Equal highs (buy-side liquidity)
- Equal lows (sell-side liquidity)
- Liquidity wicks
- New Day/Week Opening Gaps

## Dodgydd Inversion Candle Closure Rating System

Dodgydd is a YouTuber trader whose strategy Isaac layers on top of his ICT model. His framework rates the quality of the inversion candle (the MSS/CISD confirmation candle) on a 10-point scale using three components:

### Scoring Components

| Component | Max Score | What it Measures |
|-----------|-----------|-----------------|
| Candle Strength | 4/4 | How strong and clear the momentum candle is — clear and obvious momentum |
| Inversion Speed | 3/3 | How quickly price responds to and fills the FVG — immediate response scores highest |
| Risk to Reward | 3/3 | How close the candle closes to the inversion edge — tighter close = better R:R |

### Grade Scale

| Grade | Score | Description |
|-------|-------|-------------|
| A+ | 10/10 | Strength 4/4, Speed 3/3, R:R 3/3 — best-case scenario, immediate strong response, closes right at inversion edge |
| A | 9/10 | Strength 4/4, Speed X/3, R:R X/3 (total 9) — high probability, strong momentum |
| A- | 8/10 | Strength 4/4, slightly lower speed/R:R — still high probability |
| B+ | 7/10 | Strength varies (2-3/4) — less-than-ideal, ranging candle strength |
| B | 6/10 | Weak strength (1-2/4), varying speed and R:R |
| B- | 5/10 | Weak strength, slow inversion |
| C | 3-4/10 | Low probability, bad candle strength, speed and R:R |
| F | 0/10 | Invalid — key levels taken BEFORE candle closes |

### Key Insight
The inversion candle in Dodgydd's framework IS the MSS/CISD confirmation candle. This is the same candle Isaac waits for to close before entering. The Dodgydd score rates the quality of that exact moment.

## Combined Scoring System (ICT + Dodgydd)

When the scanner fires an alert, it scores two layers:

| Layer | What it checks |
|-------|---------------|
| ICT layer | HTF bias aligned? Killzone? Liquidity sweep? MSS/CISD? 2+ confluences? |
| Dodgydd layer | Candle Strength (0–4) + Inversion Speed (0–3) + R:R position (0–3) = 0–10 |

Example alert: "A+ LONG — Dodgydd 10/10 | ICT: 4H bias up, London killzone, sweep of sell-side, MSS confirmed | Entry: 17,452–17,460 | Target: equal highs 17,524 | Stop: 17,438 | R:R 2.3"

## Risk Management

- Risk per trade: 0.5–1% of account
- Minimum R:R: 1:1.5 (preference for 1:2 or better)
- Position management: take 50% off at 1R, run remainder to full target
- Maximum trades per day: 2–3
- Daily stop rules: stop after 2 losses OR after reaching 2R profit
- Pre-defined profit target REQUIRED before any order goes live (non-negotiable)

## Psychological Rules (Non-Negotiable)

- No trade without a pre-defined target
- No more than 2 losses in any session before shutting the platform down
- Only trade during the two killzones (London and NY)
- Require at least 2 ICT confluences per setup
- Log every trade the same day in Notion journal
- No aspirational lifestyle content before or during a trading session
- No revenge trading after a stop-out

## Performance Data

- Win rate: 26.1% including break-evens, 50% excluding them (July–November 2025)
- Peak months: July and September 2025
- Worst month: November 2025 (zero wins)
- March 2026 losses: All traced back to entering without a pre-defined target or confirmation

## ICT Setup Scanner — Proposed System

### Architecture
A two-part system integrated into Isaac's existing trading hub:

**Part 1: Pine Script Indicator (TradingView chart)**
- Draws FVGs, IFVGs, Order Blocks, equal highs/lows, MSS/CHoCH labels on NQ chart
- Shades killzone periods (London 07:00–10:00, NY 13:30–16:00 BST)
- Marks Asia session range (midnight–06:00 BST high/low)
- Fires webhook on candle CLOSE when A+ sequence completes (never mid-candle)
- Sends structured data: timeframe, direction, HTF bias, confluences present, killzone status, entry zone, Dodgydd score components, liquidity targets

**Part 2: Claude Scanner (new page in trading hub)**
- New `scanner.html` page matching trading hub glassmorphism design
- New `api/scanner.js` Vercel serverless function
- Receives TradingView webhook with pattern data
- Calls Claude API (Sonnet) with full ICT + Dodgydd rules
- Claude evaluates: killzone timing, HTF bias, confluence count, sequence validity, Dodgydd score
- Outputs final grade (A+, A, A-, B+, skip) with entry zone, stop, target, R:R
- Stores all flagged setups in Supabase with full context

**Part 3: Adaptive Learning Loop**
- Every flagged setup logged to Supabase with: confluences, killzone, HTF bias, Dodgydd score, grade, outcome
- Outcome recorded after trade (win/loss/break-even, actual R achieved)
- Periodic Claude analysis: "Your London FVG+IFVG+MSS setups with 4H bias aligned hit 68% win rate. NY session equivalents 31%."
- Scoring weights evolve based on Isaac's actual historical performance data
- The system learns what works for Isaac specifically, not ICT in general

### Technology Stack
- Frontend: Vanilla HTML/CSS/JS (matches existing trading hub)
- Backend: Vercel serverless functions (existing infrastructure)
- Database: Supabase (existing)
- AI: Claude API via Anthropic SDK (existing pattern from api/analyse.js)
- Chart indicator: TradingView Pine Script v5
- Design: Glassmorphism (matching existing hub aesthetic)
