---
name: Obsidian Pulse
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#c0c1ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#8083ff'
  on-tertiary-container: '#0d0096'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  data-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  data-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  data-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style
The design system manifests an institutional yet avant-garde financial intelligence platform. Designed for high-frequency operators, quantitative analysts, and modern capital allocators, it balances the disciplined data density of a Bloomberg terminal with the ethereal, hyper-refined ergonomics of Linear. 

The aesthetic fuses deep tactical minimalism with controlled glassmorphism. Interfaces emerge from deep obsidian voids, articulated through micro-luminous accents, razor-thin translucent surfaces, and crisp optical hierarchies. The experience evokes absolute precision, calculated risk, and effortless technological mastery—calm, sovereign, and intensely focused under volatile market conditions.

## Colors
The palette is engineered around dark-mode operational endurance, minimizing eye strain across 14-hour monitoring cycles while driving sharp ocular tracking.

- **Obsidian & Midnight Foundations**: The root canvas anchors at `#090D16`, ascending to elevated panels at `#0D1322` and floating card containers at `#131B2E`. Structural outlines rely on sheer whites (`rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.14)`).
- **Luminous Neon Accents**:
  - **Electric Cobalt (`#3B82F6`)**: Primary actionable energy, focused states, order routing indicators, and structural brand highlights.
  - **Luminous Emerald (`#10B981`)**: Yield creation, long positions, affirmative delta, and real-time positive network telemetry.
  - **Hyper-Violet (`#6366F1`)**: Derivative metrics, secondary chart indicators, and multi-asset overlays.
  - **Crimson Delta (`#F43F5E`)**: Short flows, liquidations, negative delta, and critical system barriers.
- **Atmospheric Depth**: Background surfaces employ ultra-low-opacity gradient sweeps (`radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.12), transparent 70%)` and `radial-gradient(ellipse at bottom left, rgba(16, 185, 129, 0.08), transparent 60%)`) to create spatial volume behind high-frequency tabular data.

## Typography
Typographic structure is split into two specialized engines:
1. **Editorial & Interface Clarity**: Plus Jakarta Sans handles macro navigational titles, operational summaries, and structural content. Its geometry softens hard mathematical grids while maintaining crisp edge definition.
2. **Financial Data & Ledger Precision**: Geist represents numeric values, ticker symbols, spreads, timestamps, order books, and tabular cells. Tabular figures (`tnum`) and slashed zeros are strictly forced across all data tokens to guarantee zero horizontal shifting during live ticker recalculations.

Labels and section headers leverage `label-caps` in uppercase styling with wide tracking (`0.08em`) to act as rigid anchor points for data modules.

## Layout & Spacing
The layout implements a high-density, fluid 12-column adaptive layout system modeled after professional trading desks.

- **Breakpoints**:
  - `Desktop Wide` (≥1440px): 12 columns, `gutter-lg` (24px), outer margins set to `margin-lg` (32px). Fully expanded multi-pane terminal with simultaneous order book, deep charts, and transaction feeds.
  - `Desktop Standard / Tablet Landscape` (1024px – 1439px): 12 columns, `gutter` (16px), outer margins set to `margin-md` (24px). Collapsible utility docks; charts prioritize primary candle metrics.
  - `Tablet Portrait` (768px – 1023px): 8 columns, `gutter` (16px), margins set to `margin-md` (24px). Secondary panels stack below interactive canvases.
  - `Mobile` (<768px): 4 columns, `gutter` (12px), canvas margin set to `margin` (16px). Single-column stack, tabular modules gain horizontal swipe-lock containers.
- **Rhythm**: Spacing follows an absolute 4px/8px mathematical increment. Component-level spacing uses `space-xs` and `space-sm` for dense information groupings (e.g., metric label to numeric value), while `space-lg` and `space-xl` partition distinct structural domains.

## Elevation & Depth
Elevation eschews heavy, muddy drop shadows in favor of luminosity, optical stacking, and layered frosted glass.

- **Base Void (Level 0)**: `#090D16` static background, absorbing light.
- **Card Tier 1 (Level 1)**: Fill `rgba(13, 19, 34, 0.72)` supported by `backdrop-filter: blur(16px)` and a boundary stroke of `1px solid rgba(255, 255, 255, 0.08)`.
- **Raised Module (Level 2)**: Fill `rgba(19, 27, 46, 0.85)` with `backdrop-filter: blur(24px)`, bounded by `1px solid rgba(255, 255, 255, 0.12)` and an ambient aura shadow of `0 8px 32px -4px rgba(0, 0, 0, 0.5)`.
- **Floating Overlays & Menus (Level 3)**: Fill `rgba(22, 33, 56, 0.95)` with `backdrop-filter: blur(32px)`, perimeter stroke `1px solid rgba(255, 255, 255, 0.16)`, and dual-light emission: `0 20px 40px -8px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.1)`.
- **Neon Glow Aura**: Active components (selected tickers, active buy/sell buttons) cast targeted chromatic glows: Cobalt elements emit `0 0 20px -4px rgba(59, 130, 246, 0.45)`, while Emerald states emit `0 0 20px -4px rgba(16, 185, 129, 0.4)`.

## Shapes
Geometry is disciplined, architectural, and compact. Level 1 (Soft) geometry ensures panels preserve structural alignment without visual clashing at dense terminal intersections.

- **Micro Controls & Cells**: Checkboxes, data tags, and inline badges adopt `0.25rem` (4px) radii.
- **Standard Controls & Cards**: Standard input fields, terminal modules, and buttons deploy `rounded-lg` (8px).
- **Floating Flyouts & Modals**: Contextual modals, command palettes, and drawer surfaces utilize `rounded-xl` (12px).
- **Proportional Borders**: Stroke width is uniformly 1px. Borders must use translucent alpha values (`rgba(255, 255, 255, 0.08)`) to maintain razor-thin optical sharpness against deep navy backgrounds.

## Components

### Buttons
- **Primary Action (Cobalt Aura)**: Solid `#3B82F6` with subtle internal top gradient (`rgba(255,255,255,0.15)`). Text in white `Plus Jakarta Sans` semi-bold. Focus/hover emits a `0 0 16px rgba(59, 130, 246, 0.5)` aura and scales the internal brightness.
- **Positive Action (Emerald Surge)**: Solid `#10B981` background, identical lighting mechanics for market buy/long execution.
- **Ghost Terminal**: Background `rgba(255, 255, 255, 0.03)`, border `1px solid rgba(255, 255, 255, 0.08)`. Hover triggers `background: rgba(255, 255, 255, 0.08)` and border brighten to `rgba(255, 255, 255, 0.2)`.

### Cards & Modules
All analytical windows, order books, and portfolio panels are built as frosted glass containers:
- Surface: `rgba(13, 19, 34, 0.72)`.
- Backdrop filter: `blur(16px) saturate(180%)`.
- Outline: `1px solid rgba(255, 255, 255, 0.08)`.
- Internal Header: Separated by a `1px solid rgba(255, 255, 255, 0.05)` baseline border with integrated drag-handle dots or status indicator pips.

### Data Tables & Lists
- Row styling: Transparent by default with a subtle left accent indicator on active selection.
- Hover interaction: Full row background transitions to `rgba(59, 130, 246, 0.06)` with a `1px` subtle highlight border on bottom.
- Typography: Headers styled with `label-caps` in `#64748B`. Values rendered strictly in `Geist` with fixed decimal place rules.

### Input Fields & Selectors
- Standard State: Fill `rgba(9, 13, 22, 0.8)`, border `1px solid rgba(255, 255, 255, 0.1)`. Placeholder text colored `#475569`.
- Focused State: Border shifts to `#3B82F6` accompanied by an inner glow `box-shadow: 0 0 0 1px #3B82F6, 0 0 12px rgba(59, 130, 246, 0.25)`.
- Numeric Steppers: Embedded quick-multiplier pills (`25%`, `50%`, `MAX`) integrated directly within the right flank of numeric inputs.

### Chips & Badges
- Positive Delta: Background `rgba(16, 185, 129, 0.12)`, text `#10B981`, border `1px solid rgba(16, 185, 129, 0.25)`.
- Negative Delta: Background `rgba(244, 63, 94, 0.12)`, text `#F43F5E`, border `1px solid rgba(244, 63, 94, 0.25)`.
- Status/Neutral: Background `rgba(255, 255, 255, 0.05)`, text `#94A3B8`, border `1px solid rgba(255, 255, 255, 0.08)`.

### Form Controls (Checkboxes & Radios)
- Checkbox: 16x16px square, radius 4px, background `rgba(255, 255, 255, 0.04)`, border `1px solid rgba(255, 255, 255, 0.15)`. Checked state transitions to `#3B82F6` with an obsidian checkmark icon and micro-glow.
- Toggle Switches: Track background `rgba(255, 255, 255, 0.1)`, active track gradient `#3B82F6` to `#6366F1`. Handle is an ultra-crisp `#FFFFFF` disc casting a downcast ambient shadow.

### Domain-Specific: High-Frequency Depth Book
- Real-time bids and asks utilize horizontal translucent bar charts rendered behind tabular rows (`rgba(16, 185, 129, 0.12)` for bids, `rgba(244, 63, 94, 0.12)` for asks).
- Flashing updates: Micro-transitions trigger an instantaneous 100ms background highlight sweep (`rgba(59, 130, 246, 0.3)`) when a block order clears.