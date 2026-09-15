# Kelus design system — exam booklet

Kelus is paper, ink, and one pass-mark green. Marketing and product share the same booklet language.

## Foundation

- Canvas: cool green-cast paper (`#eef1ec`), not cream and not pure white chrome.
- Ink: deep booklet ink (`#12160f`).
- Accent: one Kelus green (`#1f6b45`) for actions, focus, and route signals. No indigo. No Notion blue.
- Secondary text: mute green-gray (`#4a5246` / `#5a6358`) for body support and captions — both ≥4.5:1 on paper.
- Typography: Literata (optical sizes) for display and reading; IBM Plex Sans (via `--font-inter`) for UI. Wordmark stays Plex.
- Geometry: ~4px radii. Avoid SaaS twin cards, blue glows, soft multi-shadow stacks, and ALL CAPS kickers.
- Rhythm: 8px spacing base, hairline booklet rules (`#d5d9d0`), transform/opacity motion only.
- Tokens live in `tokens.css`. Prefer those variables over hard-coded hex in product UI.

## Interaction

### Marketing typography exception

Only `/`, `/route/`, and `/pricing/` opt into quiet editorial typography via
`data-marketing="editorial"`. Major headings use `--font-marketing-heading`
(Fraunces, optical sizing; Georgia/Times fallback). Body, instructions, examples,
nav, buttons and footer use `--font-marketing-sans` (Inter; Arial/Helvetica fallback).
Both are self-hosted by next/font with swap, without adding app-route preloads.
Existing type sizes and weights remain. The revision app retains its current
fonts in this marketing-only pass; do not repoint global editorial/UI tokens.

- Primary actions are Kelus green fills with white labels.
- Secondary actions are text buttons with instant press scale (`0.97`).
- Links use Kelus green and a restrained directional arrow.
- Touch targets: minimum 44×44px for header, nav, auth, and footer controls.
- Motion: bounce `0`, ease `[0.22, 1, 0.36, 1]`, 80–400ms. Respect reduced-motion preferences.

## Product constraints

- First-run Materials/Map gates preview the feature; they do not dump students into blank dead-ends.
- Pricing is a single booklet stack (free, then Exam Pass) — not twin SaaS cards.
- The topic map shows relationships when confirmed; the ranked list remains the selectable surface.
- Homepage header does not duplicate the hero sample CTA.
