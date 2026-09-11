# Kelus design system — exam booklet

Kelus is paper, ink, and one pass-mark green. Marketing and product share the same booklet language.

## Foundation

- Canvas: cool green-cast paper (`#eef1ec`), not cream and not pure white chrome.
- Ink: deep booklet ink (`#12160f`).
- Accent: one Kelus green (`#1f6b45`) for actions, focus, and route signals. No indigo. No Notion blue.
- Secondary text: mute green-gray (`#4a5246` / `#5a6358`) for body support and captions — both ≥4.5:1 on paper.
- Typography: Newsreader for display; IBM Plex Sans (via `--font-inter`) for UI. Wordmark may use editorial weight.
- Geometry: ~4px radii. Avoid SaaS twin cards, blue glows, soft multi-shadow stacks, and ALL CAPS kickers.
- Rhythm: 8px spacing base, hairline booklet rules (`#d5d9d0`), transform/opacity motion only.
- Tokens live in `tokens.css`. Prefer those variables over hard-coded hex in product UI.

## Interaction

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
