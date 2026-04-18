# Glassmorphism Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a consistent glassmorphism visual style across all 4 pages of the Trading Hub — frosted glass panels, backdrop blur, coloured glow effects, glowing orbs, and light-catching top-edge highlights.

**Architecture:** CSS-only changes. No JS, no HTML structure changes, no new pages. All glass patterns are applied by editing inline `<style>` blocks in each HTML file and the shared `styles.css`. Verification is visual — open the file in a browser after each task.

**Tech Stack:** Vanilla HTML/CSS, `backdrop-filter: blur()`, CSS custom properties, `box-shadow` glow effects.

---

## Glass Pattern Reference

These exact values are used throughout. Copy them precisely.

```css
/* Glass panel base */
background: rgba(255,255,255,0.03);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,0.07);

/* Top-edge highlight (apply as ::before on positioned parent) */
content: '';
position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
pointer-events: none;

/* Hover glow — gold (journal) */
border-color: rgba(201,168,76,0.3);
box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.07);

/* Hover glow — green (bias) */
border-color: rgba(77,170,125,0.3);
box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(77,170,125,0.07);

/* Hover glow — blue (drawdown) */
border-color: rgba(93,143,196,0.3);
box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(93,143,196,0.07);

/* Glowing dot */
box-shadow: 0 0 8px rgba(77,170,125,0.8);   /* green */
box-shadow: 0 0 8px rgba(201,168,76,0.8);   /* gold */
box-shadow: 0 0 8px rgba(93,143,196,0.8);   /* blue */
```

---

## Task 1: Update styles.css — glass utilities + shared components

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Add glass utility class and orb variables**

Open `styles.css`. After the `:root` block, add:

```css
/* ── GLASS UTILITY ── */
.glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
}
.glass-strong {
  background: rgba(255,255,255,0.045);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.09);
}
```

Also add to `:root`:
```css
--orb-gold: rgba(201,168,76,0.065);
--orb-win:  rgba(77,170,125,0.045);
--orb-blue: rgba(93,143,196,0.035);
```

- [ ] **Step 2: Update .topnav to glass**

Find `.topnav` in `styles.css`. Replace its `background` value:

```css
.topnav {
  /* existing properties kept, only change background */
  background: rgba(6,6,7,0.7);   /* was: rgba(8,8,9,0.85) — slightly more transparent */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
```

- [ ] **Step 3: Update .card base class to glass**

Find `.card` in `styles.css`. Replace background and border:

```css
.card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--r-lg);
  position: relative;
  overflow: hidden;
  transition: border-color var(--t-mid), box-shadow var(--t-mid), transform var(--t-mid);
}
.card::before {
  content: '';
  position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  pointer-events: none;
  z-index: 1;
}
.card:hover {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 16px 48px rgba(0,0,0,0.45);
}
```

- [ ] **Step 4: Update .card-sm to glass**

Find `.card-sm`. Replace:

```css
.card-sm {
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--r-md);
  transition: border-color var(--t-fast);
}
.card-sm:hover { border-color: rgba(255,255,255,0.11); }
```

- [ ] **Step 5: Update .live-dot to include glow**

Find `.live-dot`. Add `box-shadow`:

```css
.live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--win);
  display: inline-block;
  animation: livePulse 1.5s ease infinite;
  box-shadow: 0 0 8px rgba(77,170,125,0.8);
}
```

- [ ] **Step 6: Commit**

```bash
git add styles.css
git commit -m "style: add glass utilities and update shared components"
```

---

## Task 2: index.html — full glassmorphism pass

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add third orb (blue, mid-page)**

Find the two `<div class="orb orb1">` and `<div class="orb orb2">` elements in the HTML body. Add a third:

```html
<div class="orb orb3"></div>
```

In the `<style>` block, add:

```css
.orb3 { width:280px; height:280px; background:rgba(93,143,196,0.03); top:45%; left:55%; animation-delay:-2s; }
```

- [ ] **Step 2: Glass stats bar**

Find `.stats-bar` in the `<style>` block. Replace `background` and `border`:

```css
.stats-bar {
  display:flex; align-items:center; justify-content:center; gap:28px; flex-wrap:wrap;
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 14px 28px;
  margin-bottom: 8px;
  position: relative; overflow: hidden;
  animation: fadeUp 0.5s 0.2s ease both;
}
.stats-bar::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none;
}
```

- [ ] **Step 3: Glass news ticker**

Find `.ticker-wrap`. Replace `background` and `border`:

```css
.ticker-wrap {
  width:100%; overflow:hidden;
  background: rgba(255,255,255,0.02);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 0; display:flex; align-items:center;
  animation: fadeUp 0.5s 0.25s ease both;
}
.ticker-label {
  flex-shrink:0; padding:0 10px; height:26px;
  display:flex; align-items:center; gap:5px;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: rgba(201,168,76,0.05);
}
```

- [ ] **Step 4: Glass app cards**

Find `.app-card` in the `<style>` block. Replace `background` and `border`, add `backdrop-filter`:

```css
.app-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  overflow: hidden; position: relative; cursor: pointer;
  transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease, box-shadow 0.28s ease;
  text-decoration: none; display: flex; flex-direction: column;
  animation: fadeUp 0.6s ease both;
}
```

Also update the per-card hover rules to use glass glow:

```css
.card-journal:hover { transform:translateY(-7px); border-color:rgba(201,168,76,0.3); box-shadow:0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(201,168,76,0.08); }
.card-bias:hover    { transform:translateY(-7px); border-color:rgba(77,170,125,0.3);  box-shadow:0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(77,170,125,0.08); }
.card-drawdown:hover{ transform:translateY(-7px); border-color:rgba(93,143,196,0.3);  box-shadow:0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(93,143,196,0.08); }
```

Update `.card-bottom`:

```css
.card-bottom {
  padding: 16px 32px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display:flex; align-items:center; justify-content:space-between;
  background: rgba(0,0,0,0.15);
  position: relative; z-index: 1;
}
```

- [ ] **Step 5: Glass info cards (IFVG / CISD / EQH)**

Find `.info-card`. Replace:

```css
.info-card {
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 20px 22px;
  position: relative; overflow: hidden;
  transition: border-color 0.2s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease;
}
.info-card::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none;
}
.info-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px; opacity: 0;
  transition: opacity 0.2s;
}
.info-card:nth-child(1)::after { background: linear-gradient(90deg, transparent, var(--gold), transparent); }
.info-card:nth-child(2)::after { background: linear-gradient(90deg, transparent, var(--win), transparent); }
.info-card:nth-child(3)::after { background: linear-gradient(90deg, transparent, var(--blue), transparent); }
.info-card:hover { border-color:rgba(255,255,255,0.12); transform:translateY(-3px); box-shadow:0 12px 32px rgba(0,0,0,0.4); }
.info-card:hover::after { opacity: 1; }
```

- [ ] **Step 6: Glass panels (checklist, rules, TOTW, weekly report)**

Find `.panel`. Replace:

```css
.panel {
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden; position: relative;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}
.panel::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none; z-index: 1;
}
.panel:hover { border-color:rgba(255,255,255,0.11); box-shadow:0 8px 32px rgba(0,0,0,0.3); transform:translateY(-2px); }
.panel-hdr {
  padding: 18px 22px;
  display:flex; align-items:center; justify-content:space-between;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.01);
  position: relative; z-index: 1;
}
```

- [ ] **Step 7: Glowing checklist progress bar**

Find `.chk-fill`. Add `box-shadow`:

```css
.chk-fill { height:100%; background:linear-gradient(90deg,var(--win),#3a8a5a); transition:width 0.5s ease; box-shadow: 0 0 8px rgba(77,170,125,0.5); }
```

Also make `.chk-progress` slightly visible:

```css
.chk-progress { height:2px; background:rgba(255,255,255,0.04); overflow:hidden; margin:0 20px 16px; }
```

- [ ] **Step 8: Glass report cards (weekly edge)**

Find `.report-card`. Replace:

```css
.report-card {
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 16px 18px;
  position: relative; overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
.report-card::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none;
}
.report-card:hover { border-color:rgba(255,255,255,0.11); transform:translateY(-2px); }
```

- [ ] **Step 9: Open index.html in browser and verify**

Open `C:\Users\Untitled00\Documents\claudecode test\trading-hub\index.html` in Chrome/Edge.

Check:
- Stats bar has frosted glass look (slightly see-through, light top edge)
- App cards show coloured glow on hover (gold for journal, green for bias, blue for R tracker)
- Info cards have bottom accent line on hover
- Panels (checklist, rules) have glass appearance
- Progress bar has green glow when partially filled
- 3 orbs visible in background (gold top-left, green bottom-right, blue mid)

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "style: apply glassmorphism to index.html"
```

---

## Task 3: bias.html — glassmorphism pass

**Files:**
- Modify: `bias.html`

- [ ] **Step 1: Glass top nav**

Find `.topnav` in `bias.html` `<style>` block. Replace `background`:

```css
.topnav {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(6,6,7,0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position:sticky; top:0; z-index:100;
}
```

- [ ] **Step 2: Add background orbs to bias.html body**

In the HTML body, after `<body>`, add:

```html
<div style="position:fixed;width:400px;height:400px;border-radius:50%;filter:blur(90px);background:rgba(201,168,76,0.055);top:-100px;left:-100px;pointer-events:none;z-index:0;"></div>
<div style="position:fixed;width:300px;height:300px;border-radius:50%;filter:blur(90px);background:rgba(77,170,125,0.04);bottom:-80px;right:-80px;pointer-events:none;z-index:0;animation-delay:-4s;"></div>
```

Also add `position:relative; z-index:1;` to the main wrapper element (`.main` or the outermost content div).

- [ ] **Step 3: Glass chart container**

Find `.chart-header` and `.chart-body`. Replace backgrounds:

```css
.chart-header {
  display:flex; align-items:center; justify-content:space-between;
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
  border-bottom: none;
  border-radius: 14px 14px 0 0; padding:14px 20px;
  position: relative; overflow: hidden;
}
.chart-header::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  pointer-events: none;
}
.chart-body {
  border: 1px solid rgba(255,255,255,0.07);
  border-top: 1px solid rgba(201,168,76,0.12);
  border-radius: 0 0 14px 14px; overflow:hidden;
  background: rgba(6,6,7,0.6);
}
```

- [ ] **Step 4: Glass timeframe buttons**

Find `.tf-btn`. Replace:

```css
.tf-btn {
  font-family:'Fragment Mono',monospace; font-size:9px;
  padding:5px 14px; border-radius:6px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(8px);
  color:var(--muted); cursor:pointer;
  transition:all 0.15s;
}
.tf-btn:hover { color:var(--text); border-color:rgba(255,255,255,0.12); }
.tf-btn.active {
  background: rgba(201,168,76,0.1);
  border-color: rgba(201,168,76,0.3);
  color: var(--gold);
  box-shadow: 0 0 12px rgba(201,168,76,0.15);
}
```

- [ ] **Step 5: Glass calendar table**

Find `.cal-table`. Replace background and border:

```css
.cal-table {
  background: rgba(255,255,255,0.02);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; overflow:hidden;
  position: relative;
}
.cal-table::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none; z-index: 1;
}
```

Find `.cal-head`. Replace background:

```css
.cal-head {
  display:grid; grid-template-columns:90px 70px 60px 1fr 90px 90px 90px;
  padding:10px 20px; border-bottom:1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
}
```

Find `.cal-row:hover`. Replace:

```css
.cal-row:hover { background: rgba(255,255,255,0.025); }
```

- [ ] **Step 6: Glass results/analysis cards**

Find the result card containers (look for `.vh-lbl`, `.vh-big`, `.vh-conf` parent elements — typically `.view-card`, `.ic-box`, or similar wrapper divs). They likely use `background:var(--bg3)` or `background:var(--bg2)`. Replace with glass:

```css
/* Apply to all result card wrappers in bias.html */
background: rgba(255,255,255,0.025);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,0.07);
position: relative; overflow: hidden;
```

Add top-highlight `::before` to each (or add `class="glass"` to the HTML elements if faster).

- [ ] **Step 7: Open bias.html in browser and verify**

Open `C:\Users\Untitled00\Documents\claudecode test\trading-hub\bias.html`.

Check:
- Top nav is glass/frosted
- Chart container has glass border with gold accent on bottom edge
- TF buttons (1H/4H/15M) have glass style, active one glows gold
- Calendar rows have subtle hover highlight
- Background orbs visible

- [ ] **Step 8: Commit**

```bash
git add bias.html
git commit -m "style: apply glassmorphism to bias.html"
```

---

## Task 4: drawdown.html — glassmorphism pass

**Files:**
- Modify: `drawdown.html`

- [ ] **Step 1: Glass top nav**

Find `.topnav` in `drawdown.html`. Same change as bias.html:

```css
.topnav {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(6,6,7,0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position:sticky; top:0; z-index:100;
}
```

- [ ] **Step 2: Add background orbs**

In the HTML body after `<body>`, add:

```html
<div style="position:fixed;width:400px;height:400px;border-radius:50%;filter:blur(90px);background:rgba(201,168,76,0.055);top:-100px;left:-100px;pointer-events:none;z-index:0;"></div>
<div style="position:fixed;width:300px;height:300px;border-radius:50%;filter:blur(90px);background:rgba(77,170,125,0.04);bottom:-80px;right:-80px;pointer-events:none;z-index:0;"></div>
<div style="position:fixed;width:260px;height:260px;border-radius:50%;filter:blur(90px);background:rgba(93,143,196,0.03);top:40%;left:55%;pointer-events:none;z-index:0;"></div>
```

Add `position:relative; z-index:1;` to the page's main content wrapper.

- [ ] **Step 3: Glass stat cards**

Find the stat card class (likely `.stat-card`, `.kpi-card`, or similar — grep the file for `stat-val`). Replace background/border:

```css
/* Stat card container — replace var(--bg2)/var(--bg3) with glass */
background: rgba(255,255,255,0.025);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,0.07);
position: relative; overflow: hidden;
```

Add a coloured top accent to each stat card based on value type:
- Positive/R stat → gold top accent: `border-top: 2px solid rgba(201,168,76,0.5);`
- Win rate → green: `border-top: 2px solid rgba(77,170,125,0.5);`
- Drawdown → red: `border-top: 2px solid rgba(191,96,96,0.5);`

- [ ] **Step 4: Glass chart containers**

Find chart wrapper divs (look for `.chart-wrap`, `.chart-box`, or parent of `<canvas>`). Replace background/border:

```css
background: rgba(255,255,255,0.02);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.07);
border-radius: 14px; overflow: hidden;
position: relative;
```

Add top highlight `::before` (or inline style on the wrapper).

- [ ] **Step 5: Glass tab buttons (Eval / Live / All)**

Find the tab button styles. Replace:

```css
/* Tab button base */
background: rgba(255,255,255,0.03);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.07);
border-radius: 7px;
transition: all 0.15s ease;

/* Active tab */
background: rgba(201,168,76,0.1);
border-color: rgba(201,168,76,0.3);
color: var(--gold);
box-shadow: 0 0 12px rgba(201,168,76,0.15);
```

- [ ] **Step 6: Glass alert banners**

Find alert/warning banner styles (look for `.alert`, `.dd-alert`, or similar). Replace:

```css
background: rgba(191,96,96,0.06);
backdrop-filter: blur(12px);
border: 1px solid rgba(191,96,96,0.2);
border-left: 3px solid var(--loss);
box-shadow: 0 0 20px rgba(191,96,96,0.05);
```

- [ ] **Step 7: Open drawdown.html in browser and verify**

Check:
- Nav is frosted glass
- Stat cards have glass look with coloured top accent
- Chart containers have glass border + top highlight
- Tab buttons (Eval/Live/All) glass style, active glows gold
- Background orbs visible

- [ ] **Step 8: Commit**

```bash
git add drawdown.html
git commit -m "style: apply glassmorphism to drawdown.html"
```

---

## Task 5: journal.html — glassmorphism pass

**Files:**
- Modify: `journal.html`

- [ ] **Step 1: Glass sidebar**

Find `.sidebar` in `journal.html`. Replace background/border:

```css
.sidebar {
  width: var(--sidebar);
  /* existing positioning properties kept */
  background: rgba(8,8,9,0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255,255,255,0.06);
}
```

- [ ] **Step 2: Add background orbs**

After `<body>`, add:

```html
<div style="position:fixed;width:400px;height:400px;border-radius:50%;filter:blur(90px);background:rgba(201,168,76,0.055);top:-100px;left:-100px;pointer-events:none;z-index:0;"></div>
<div style="position:fixed;width:300px;height:300px;border-radius:50%;filter:blur(90px);background:rgba(77,170,125,0.04);bottom:-80px;right:-80px;pointer-events:none;z-index:0;"></div>
<div style="position:fixed;width:260px;height:260px;border-radius:50%;filter:blur(90px);background:rgba(93,143,196,0.03);top:40%;right:10%;pointer-events:none;z-index:0;"></div>
```

- [ ] **Step 3: Glass dashboard stat cards**

Find stat card containers (look for `.bms-lbl`, `.bms-val` parents — likely `.stat-card`, `.bms-card`, or inline styled divs). Replace `background:var(--bg2)` / `background:var(--bg3)` with:

```css
background: rgba(255,255,255,0.025);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,0.07);
position: relative; overflow: hidden;
```

For any card wrapper that has a top-accent, add `::before` top-highlight or use inline style.

- [ ] **Step 4: Glass chart containers**

Find `<canvas>` parent wrappers. Replace background and border:

```css
background: rgba(255,255,255,0.02);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.07);
border-radius: 12px; overflow: hidden;
```

- [ ] **Step 5: Glass trade log rows**

Find `.trade-row` or equivalent (the repeating trade list item). Replace hover state:

```css
.trade-row:hover {
  background: rgba(255,255,255,0.025);
}
```

Find the trade log container. Replace background:

```css
background: rgba(255,255,255,0.02);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.07);
```

- [ ] **Step 6: Glass calendar day cells**

Find calendar day cell styles (look for `.day-cell`, `.cal-day`, or similar). Replace background/border:

```css
background: rgba(255,255,255,0.02);
border: 1px solid rgba(255,255,255,0.05);
border-radius: 8px;
transition: background 0.15s, border-color 0.15s;
```

Hover state:

```css
background: rgba(255,255,255,0.04);
border-color: rgba(255,255,255,0.09);
```

- [ ] **Step 7: Glass modals and overlays**

Find `.modal` or modal overlay containers. Replace:

```css
/* Modal panel */
background: rgba(14,14,15,0.75);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border: 1px solid rgba(255,255,255,0.09);
border-radius: 18px;
position: relative; overflow: hidden;
```

Add top-highlight `::before` to modal:

```css
.modal::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
  pointer-events: none;
}
```

- [ ] **Step 8: Glass form inputs**

Find `input`, `textarea`, `select` styles. Replace background/border:

```css
background: rgba(255,255,255,0.03);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.08);
color: var(--text);
transition: border-color 0.15s, box-shadow 0.15s;
```

Focus state — add gold glow:

```css
/* :focus state */
border-color: rgba(201,168,76,0.4);
box-shadow: 0 0 0 3px rgba(201,168,76,0.08);
outline: none;
```

- [ ] **Step 9: Open journal.html in browser and verify**

Check:
- Sidebar has glass/frosted look
- Dashboard stat cards are glass
- Charts have glass border
- Trade log rows have subtle glass hover
- Calendar cells are glass
- Modal opens with frosted glass + strong blur
- Inputs have glass background, gold glow on focus
- Background orbs visible behind content

- [ ] **Step 10: Commit**

```bash
git add journal.html
git commit -m "style: apply glassmorphism to journal.html"
```

---

## Task 6: Final push to GitHub

**Files:** None new

- [ ] **Step 1: Verify all 4 pages look consistent**

Open each page in browser:
- `index.html` — glass stats bar, glowing cards, glass panels
- `bias.html` — glass nav, chart, calendar
- `drawdown.html` — glass nav, stat cards, charts, tabs
- `journal.html` — glass sidebar, cards, modals, inputs

Confirm the same glass aesthetic is consistent across all pages.

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Done**

The glassmorphism redesign is live on GitHub and will auto-deploy on Vercel within ~1 minute.
