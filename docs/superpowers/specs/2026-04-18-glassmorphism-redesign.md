# Trading Hub — Glassmorphism Redesign

**Date:** 2026-04-18  
**Scope:** All 4 pages — index.html, bias.html, drawdown.html, journal.html  
**Design direction:** Glassmorphism — frosted glass panels, backdrop blur, glowing orbs, light-catching top edges

---

## Design Principles

- **Glass panels:** `background: rgba(255,255,255,0.03)` + `backdrop-filter: blur(16–20px)` on all cards, stats bars, navs, and panels
- **Top-edge highlight:** Every glass panel has a 1px gradient line at the top: `linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)`
- **Coloured glow on hover:** Cards glow their accent colour on hover via `box-shadow` — gold for journal, green for bias, blue for R tracker
- **Background depth:** 3 fixed blurred orbs (gold top-left, green bottom-right, blue mid) behind all content
- **Subtle grid:** Low-opacity gold grid lines on body background (already in place, keep)
- **Accent bars:** 2px gradient top border on app cards, colour-matched per tool
- **Glowing dots:** Status dots and feature dots have `box-shadow` colour glow
- **Smooth animations:** All transitions 250–280ms, card lift uses `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring feel

---

## Shared styles.css Changes

- Add `.glass` utility: `background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.07);`
- Add `.glass-edge::before` top-highlight pattern
- Update `.topnav` to use glass (already partially done — strengthen blur to 16px, reduce bg opacity)
- Update `.card`, `.card-sm`, `.panel` base classes to use glass
- Add `--orb-gold`, `--orb-win`, `--orb-blue` CSS variables for orb colours
- Update `.live-dot` to include glow `box-shadow`

---

## Page-by-Page Changes

### index.html
- Stats bar → glass panel with top highlight
- News ticker → glass panel  
- App cards → glass with backdrop blur, coloured glow on hover, inner glow overlay
- Info cards (IFVG/CISD/EQH) → glass with bottom accent line on hover
- Panels (checklist, rules, TOTW, weekly report) → glass with top highlight
- Progress bar (checklist) → glowing green fill
- Background → 3 orbs (gold, green, blue)

### bias.html
- Top nav → glass (backdrop-filter: blur(16px))
- Hero section background → subtle radial gold orb
- Chart container → glass border + top highlight
- Timeframe buttons → glass pill style, active state with gold glow
- Calendar table → glass background, row hover with subtle glass highlight
- Results cards (bias score, session, sentiment) → glass with accent glow
- Loading spinner → keep, style with gold colour

### drawdown.html
- Top nav → glass
- Stat cards (profit factor, avg R, etc.) → glass with coloured top accent
- Chart containers → glass border + top highlight
- Tab buttons (Eval/Live/All) → glass pill style
- Alert banners → glass with coloured left border + glow

### journal.html
- Sidebar → glass (semi-transparent, backdrop blur)
- Dashboard stat cards → glass with top highlight
- Chart containers → glass border
- Trade log table → glass rows, hover highlight
- Calendar grid → glass day cells
- Modal/overlays → glass with stronger blur (24px)
- Form inputs → glass background, gold focus ring glow

---

## Colour Tokens (no changes to values, just usage)

All existing CSS variables stay the same. New usage rules:
- Card/panel backgrounds: `rgba(255,255,255,0.025–0.04)` instead of `var(--bg2)`
- Borders: `rgba(255,255,255,0.07–0.08)` instead of `var(--border)`
- Hover borders: `rgba(accent, 0.3)` matching card colour
- Hover shadows: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(accent, 0.07)`

---

## Out of Scope

- No changes to JavaScript logic or data fetching
- No changes to HTML structure or page layout
- No changes to Chart.js chart types or data
- No light mode
- No new pages or features
