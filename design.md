# Kelus design system — indigo ledger

Kelus uses the supplied Stripe reference as design DNA, not as copied branding. The product keeps its learning content, routes, illustrations, and logic while adopting a quieter financial-instrument level of precision.

## Foundation

- Canvas: pure white with mist bands only where structural separation is needed.
- Ink: midnight navy (`#061b31`), never pure black.
- Accent: one functional indigo (`#533afd`) used for actions, active navigation, focus, and route signals.
- Secondary text: steel (`#50617a`) for body support; smoke (`#5b6f92`) for captions/kickers — both ≥4.5:1 on white.
- Typography: Inter Tight as the production-safe Sohne substitute. Display text is weight 300; interface text is 400; the Kelus wordmark may use 600.
- Geometry: 4px radii for controls and bounded surfaces. Avoid pills and soft marketing cards.
- Rhythm: 8px spacing base, generous 96px section rhythm (`--section-rhythm`), 1px frost dividers.
- Tokens live in `tokens.css`. Prefer those variables over hard-coded hex in product UI.
- Layout widths: `--page-max-width`, `--shell-width`, `--shell-narrow`, `--study-width`, `--workspace-width`.
- Z-index: `--z-sticky` → `--z-header` → `--z-overlay` → `--z-sheet` → `--z-toast`.
- Focus: `--focus-ring-width` / `--focus-ring-offset` / `--focus-ring-color` (use `.focus-ring` or match those values).

## Materials & depth (when allowed)

Default product lists stay flat hairline-on-white (ledger rows). Use materials/elevation only when a surface needs presence or separation:

| Token / utility | Use |
| --- | --- |
| `--surface-0` / white | Default canvas and dense lists |
| `--surface-1` / mist | Quiet bands, inspectors |
| `--surface-2` / `.surface-raised` | Marketing demos, featured plans, setup callouts |
| `--elevation-1`–`2` | Sparse featured panels only — never every list row |
| `--material-header` | Sticky chrome with backdrop blur |
| `.rule-ledger` | Midnight top rule + frost bottom on instrument panels |

Avoid purple glow, cream-terracotta themes, dark mode, and card spam. Gradients are limited to atmospheric mist washes and panel fill mixes already defined in tokens.

## Interaction

- Primary actions are indigo fills with white labels.
- Secondary actions are transparent with lavender hairline borders.
- Links use indigo and a restrained directional arrow.
- Touch targets: minimum 44×44px for header, nav, auth, and footer controls.
- Motion is brief and functional: 160–280ms for UI state; longer only for scroll reveal. Opacity and transform only. Bounce 0.
- Shared motion constants: `@/components/motion` (`kelusMotion`, `Reveal`, `Fade`, `Stagger`, `Pressable`, `sheetMotion`).
- Respect reduced-motion and reduced-transparency preferences.

## Product constraints

- Preserve the current learning engine and honest limitations.
- Keep the student illustration as Kelus-owned identity, but do not add decorative imagery.
- Hero art: prefer `/hero/student.webp` with PNG fallback; keep the asset lean for LCP.
- Prefer visible product evidence over additional marketing sections.
- Every mobile layout must work at 320, 375, 414, and 768px without horizontal overflow.
- Light theme only for the product surfaces (no shipping dark mode until designed).
