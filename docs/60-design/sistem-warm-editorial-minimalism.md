---
name: Warm Editorial Minimalism
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004e47'
  on-tertiary: '#ffffff'
  tertiary-container: '#00685f'
  on-tertiary-container: '#7be7d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a sanctuary of fiscal clarity. Unlike aggressive day-trading platforms engineered around casino mechanics, red/green panic triggers, and unyielding visual noise, this system brings the considered, disciplined atmosphere of editorial wealth management to modern personal mobile investing.

### Personality & Attitude
- **Serene Precision:** Numbers are presented with calm authority. Negative returns are treated as analytical facts rather than crises; gains are presented with quiet dignity rather than carnival fireworks.
- **Architectural Clarity:** Layouts rely on ample breathing room, structural hierarchy, tactile 1px hairline boundaries, and restrained functional color.
- **Human-Centric Intelligence:** Natural language replaces institutional jargon. Explanatory annotations and plain-language summaries bridge the gap between technical accounting and daily comprehension.

### Style Archetype
A synthesis of **Warm Editorial Publishing** and **Modern Swiss Utilitarianism**. Surfaces mimic weighted, warm porcelain stock. Line work is razor-sharp (hairline, 1px), and typography balances rigorous tabular alignment with humanistic character geometry.

## Colors

The palette rejects jarring fluorescent trading indicators in favor of rich, light-fast ink tones and mineral accents over an unbleached, porcelain backdrop.

### Core Canvas & Structure
- **Canvas Base (`#FBFBFC`):** An optical-comfort warm porcelain background preventing screen glare while avoiding muddy sepia.
- **Surface Elevation 1 (`#FFFFFF`):** High-purity white used for floating cards, bottom sheets, and input fields.
- **Surface Elevation 2 (`#F1F4F8`):** Tinted soft slate-wash for input containers, pill backgrounds, segmented control wells, and secondary metrics.
- **Hairline Border (`#ECEEF2`):** A subtle cool-slate boundary that cleanly defines modules without creating visual cages.
- **Border Focus / Active (`#CBD5E1`):** Applied to active toggles and selected container strokes.

### Typography & Content Inks
- **Primary Ink (`#0F172A`):** Deep slate charcoal for primary balances, titles, and principal numerical figures.
- **Secondary Ink (`#475569`):** Medium slate for supportive copy, standard data labels, and chart axis text.
- **Muted Ink (`#94A3B8`):** Light slate for micro-captions, timestamps, disabled controls, and watermark metadata.

### Accent & Semantic Financial States
- **Accent Cobalt (`#1D4ED8`):** Deep electric cerulean reserved strictly for focal interactions (primary CTAs, active segmented states, selected portfolio ranges).
- **Gain / Growth Emerald (`#0D9488`):** Deep forest teal-emerald. Highly legible on `#FFFFFF` and `#F1F4F8`, avoiding standard eye-fatiguing neon green. Paired with a soft background wash (`#F0FDFA`) for status tags.
- **Loss / Correction Carmine (`#C53030`):** Grounded warm carmine. Conveys deficit accurately without hyper-saturating the screen with anxiety. Paired with a muted background wash (`#FEF2F2`).
- **Advisory / Neutral Gold (`#B45309`):** Subdued amber used exclusively for analytical disclaimers, educational flags, and pending settlement indicators.

## Typography

The type system prioritizes mathematical cadence, scan-path efficiency, and editorial elegance across mobile touchscreens.

### Tabular Integrity
All monetary values, portfolio weights, percentage deltas, and quantitative timestamps must enforce OpenType tabular figures (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1`). This eliminates jitter when live values recalculate or during horizontal comparison across financial table rows.

### Hierarchy & Role Distribution
- **Display Figures (`display-lg`, `display-md`):** Reserved exclusively for net-worth balances, total asset valuations, and primary account metrics.
- **Section Titles (`title-md`):** Distinct anchor for module titles, sheet headers, and asset groupings.
- **Narrative Copy (`body-lg`, `body-md`):** Optimized for readability in plain-language analytical summaries, educational callouts, and transaction descriptions.
- **KPI & Category Labels (`label-sm`):** Set in deliberate uppercase with positive tracking (`letterSpacing: 0.06em`). Used for metric labels (e.g., `TOTAL COST`, `24H DELTA`, `ALLOCATION RATIO`) to ground the layout with crisp architectural tags.

## Layout & Spacing

Designed fundamentally for handheld mobile viewports (iOS and Android), adhering strictly to hardware boundaries, native home indicators, and ergonomic one-thumb interaction zones.

### Mobile Grid & Canvas Rules
- **Canvas Shell:** Fluid full-width viewport constrained within device safe areas (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
- **Horizontal Screen Inset:** A fixed `16px` (`1rem`) margin frames the content, guaranteeing that cards and actionable targets never collide with phone bezel radii.
- **Vertical Rythm:** Stacked cards and semantic dashboard blocks maintain an unambiguous `12px` or `16px` vertical inter-block clearance. 
- **Internal Component Spacing:**
  - KPI Blocks: `16px` padding around metrics.
  - Interactive rows: `12px` vertical padding with `16px` horizontal padding, establishing a minimum hit area of `44px` height.
  - Modal sheets: `24px` internal padding for breathing room.

## Elevation & Depth

This system avoids aggressive, dark drop shadows and frosted blurred backgrounds, opting for a clean, editorial layering technique that relies on tonal contrast and precision outlines.

### Architectural Tiers
1. **Tier 0 (Canvas Base):** Ground level (`#FBFBFC`). Unadorned structural ground.
2. **Tier 1 (Surface Cards & Lists):** Pure `#FFFFFF` resting on `#FBFBFC`. Elevation is generated strictly by a crisp, uniform hairline border: `1px solid #ECEEF2`. To prevent a flat, lifeless appearance, cards feature an imperceptible ambient shadow: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02)`.
3. **Tier 2 (Tactile Bottom Sheets & Action Drawers):** Pure `#FFFFFF` elevated above a dimmed modal veil (`rgba(15, 23, 42, 0.36)`). Layer depth is rendered using a soft vertical diffuse shadow: `box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.06)`.
4. **Tier 3 (Floating Action & Tooltips):** Deep Slate Ink (`#0F172A`) or pure white pills with high-definition outline: `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The geometric identity balances the approachability of modern mobile design with the sharp discipline of finance.

### Shape Scale Rules
- **Base Components (`rounded`, 8px):** Input fields, segmented control individual segments, micro-badges, and asset ticker tags.
- **Composite Containers (`rounded-lg`, 12px to 14px):** Portfolio KPI cards, asset list items, AI insight modules, and interactive financial heatmap cells.
- **Modal Elements (`rounded-xl`, 20px top radii):** Tactile bottom sheets, asset detail slide-overs, and contextual drawers.
- **Pills & Selectors (`full`, 9999px):** Range filters (`1D`, `1W`, `1M`, `1Y`, `ALL`), quick-action buttons, and floating pill status indicators.

## Components

### KPI & Portfolio Metric Blocks
- Structured cards housing core quantitative metrics. Primary value uses `display-lg` (`#0F172A`), tabular numerals.
- Label positioned above the figure using `label-sm` uppercase tracking with `#475569`.
- Sub-row features the delta tag: compact badge with `4px 8px` padding, `6px` radius, showing percentage and absolute amount with tabular alignment (gain: `#0D9488` over `#F0FDFA`; loss: `#C53030` over `#FEF2F2`).

### AI Natural Language Summary Card
- Purpose-built card translating portfolio fluctuations into calm, factual sentences.
- Container: Background `#F8FAFC`, border `1px solid #E2E8F0`, corner radius `14px`, internal padding `16px`.
- Header: Subtle cobalt or slate spark icon paired with `Yapay Zekâ Özeti` (`12px`, weight 600, color `#1D4ED8` or `#334155`).
- Footer: Regulatory advisory mark (`Yatırım tavsiyesi değildir`) rendered in `11px` muted ink (`#94A3B8`).

### Segmented Asset & Timeline Selectors
- Outer trough: `#F1F4F8`, `4px` internal padding, `10px` border radius.
- Inactive segment: Transparent background, `#475569` text, `13px` medium weight.
- Active segment: `#FFFFFF` pill, `1px solid #ECEEF2`, `#0F172A` bold text, subtle lift via `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)`.

### Buttons
- **Primary:** Background `#1D4ED8`, text `#FFFFFF`, height `48px`, radius `10px`, font weight 600. Active touch state dims to `#1E40AF`.
- **Secondary:** Background `#FFFFFF`, border `1px solid #ECEEF2`, text `#0F172A`, height `48px`. Active touch state washes with `#F8F9FA`.
- **Tertiary / Destructive:** Muted carmine text (`#C53030`) on transparent or `#FEF2F2` background.

### Asset List Rows
- Horizontal row with `44px+` touch envelope. Left column: asset monogram badge (`36x36px`, rounded `8px`, `#F1F4F8` background) and asset name (`15px`, weight 600).
- Right column: Right-aligned current price (`15px`, tabular, `#0F172A`) over percentage return (`13px`, tabular, `#0D9488` or `#C53030`).
- Bottom separator: Hairline border `1px solid #F1F4F8` indented past the monogram icon.

### Form Inputs & Checkboxes
- **Input Fields:** Minimum height `48px`, background `#FFFFFF`, border `1px solid #ECEEF2`, border radius `10px`, internal padding `12px 14px`. On focus: border shifts cleanly to `#1D4ED8` with zero outer neon glow.
- **Checkboxes & Radios:** Minimal `20x20px` bounds, subtle slate border (`#CBD5E1`), transitioning to filled cobalt (`#1D4ED8`) with crisp white interior iconography when active.

### Tactile Bottom Sheets
- Rounded top corners (`20px`), background `#FFFFFF`, anchored by a standard hardware handle indicator (`36x4px`, `#CBD5E1`, `12px` from sheet apex).
- Native dismiss gesture coupled with explicit right-hand top exit close tap-target.