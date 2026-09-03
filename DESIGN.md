---
name: Kelus
description: Forest-green Operate-mode UI for validated eBay offer comparison
colors:
  ink: "#112724"
  forest: "#0d4640"
  green: "#17675f"
  mint: "#d9eee9"
  paper: "#fdfcf8"
  line: "#d9dfdb"
  muted: "#65716e"
  wash: "#f1f5f2"
  pi-ink: "#10221e"
  pi-body: "#52615c"
  pi-action: "#103e35"
  pi-success-wash: "#eaf3ef"
typography:
  display:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontWeight: 700
    letterSpacing: "-0.04em"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "15px"
    lineHeight: 1.55
  utility:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.08em"
    textTransform: uppercase
rounded:
  sm: "7px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  section: "56px"
  card: "24px"
  control: "12px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 19px"
    height: "47px"
  button-primary-hover:
    backgroundColor: "#0a3834"
  badge-status:
    backgroundColor: "{colors.pi-success-wash}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
---

## Overview

Kelus uses an **Operate-mode** design system: task-first, scannable, forest-green accents on warm paper. Headlines use Fraunces/Playfair; UI uses DM Sans/Inter. Product comparison pages (`pi-*`) use a slightly denser editorial scale with tabular nums for prices.

## Colors

| Role | Token | Usage |
|------|-------|-------|
| Primary action | `--forest` / `--pi-action` | CTAs, links, active nav |
| Accent | `--green` | Labels, success, focus hints |
| Surface | `--paper` / `#fffefa` | Page and card backgrounds |
| Text | `--ink` / `--pi-ink` | Headlines and primary copy |
| Muted | `--muted` / `--pi-muted` | Secondary copy, labels |
| Success wash | `--pi-success-wash` | Verdict callouts, reached alerts |
| Warning wash | `#f4ead5` | Stale snapshot, savings caveats |

Accent color is for **primary actions and state only**—not decorative gradients.

## Typography

- **Display**: Fraunces or Playfair Display, tight letter-spacing (`-0.02em` to `-0.04em`)
- **Body**: DM Sans 14–17px, line-height 1.55–1.62
- **Utility labels**: 10–11px, uppercase, letter-spacing `0.08–0.13em`, weight 700–800
- **Product hero price**: `clamp(44px, 6vw, 60px)` tabular nums
- **Fixed rem scale** on product pages—no fluid clamp on UI labels

## Layout

- Content max-width: `1180px` (`.section`), product content `860px` (`.pi-content`)
- Home desk: split work surface — search rail left, live pick card right
- Search console: full header + distinct search panel (not header-embedded)
- Product decision strip: one View offer + Track pair after verdict/known total; proof and comparison below
- Mobile: bottom-sheet search overlay; sticky View offer (`pi-mobile-cta`); Track stays in the decision strip
- Grid gaps: 12–28px for cards; 48–64px between major sections

## Elevation & Depth

- Cards: `1px` border (`--line` / `--pi-line`) + subtle shadow on hover only
- Search pill: `0 14px 40px rgba(0,0,0,.22)` on home hero
- Mobile CTA bar: `backdrop-filter: blur(8px)` + top border
- Prefer tonal layering over heavy shadows

## Shapes

- Buttons/inputs: `7–10px` radius
- Cards: `10–14px` radius
- Status badges: pill (`999px`)
- Comparison pick row: `3px` left border accent

## Components

### Buttons
- Primary: forest fill, white text, min-height 44–52px
- Secondary: white fill, forest border
- States required: default, hover (`translateY(-1px)`), focus (`3px #9fcfc3`), active, disabled, loading

### Search combobox
- Pill on home; full grid on search page
- Suggestions: `is-active` with inset left border + background wash
- Mobile: fixed overlay + scrim, scroll lock

### Badges
- One or two words, pill shape, semantic color
- Pick: green wash; Cheapest: amber wash; Alert status: reached/dropped/watching

### Empty states
- Icon in circle, headline, 3-step list, primary CTA + secondary sign-in

### Product pick (`pi-pick`)
- Verdict callout → known total → decision strip (View offer + Track) → evidence (collapsed) → comparison → quiet commission note

## Do's and Don'ts

**Do**
- Show known totals and freshness state explicitly
- Use skeleton loaders for comparison loading
- Keep one primary CTA per viewport section
- Animate state changes 150–250ms with `prefers-reduced-motion` fallback

**Don't**
- Add fake user counts, star ratings, or aggregate savings claims
- Use purple gradients or generic AI landing-page patterns
- Open all evidence panels by default on product page
- Mix display fonts in buttons or data tables
