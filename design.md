# Kelus design system — indigo ledger

**This is the default visual system and product flow.** Do not replace it with Kelus green, cream paper, Source Serif, or a new token set unless the user explicitly asks.

Kelus uses the supplied Stripe reference as design DNA, not as copied branding. The product keeps its learning content, routes, illustrations, and logic while adopting a quieter financial-instrument level of precision.

Live source of truth: the current `main` site (kelus.me). Tokens live in `tokens.css`. Chrome is `components/SiteHeader.tsx`.

## Default product flow

Work inside this structure. Do not invent a parallel homepage or a second app header.

1. **Site header (every page)** — `SiteHeader`  
   Kelus · Today · Materials · Map · How it works · Study now → `/today`
2. **Homepage** — `app/page.tsx`  
   `KelusHero` → `StartHereJourney` → `HomeAfterHero`
3. **First use** — `/today`  
   Destination setup → diagnosis → today’s route
4. **Study** — `/session`  
   Retrieval, mastery change, reroute
5. **How it works** — `/route`  
   Longer explanation of the route logic

The student-at-the-desk illustration stays as Kelus-owned identity in the hero. Do not add more decorative imagery.

## Foundation

- Canvas: pure white with mist bands only where structural separation is needed.
- Ink: midnight navy (`#061b31`), never pure black.
- Accent: one functional indigo (`#533afd`) for actions, active navigation, focus, and route signals. Hover `#7389ff`.
- Typography: Inter Tight as the production-safe Sohne substitute. Display text is weight 300; interface text is 400; the Kelus wordmark may use 600.
- Geometry: 4px radii for controls and bounded surfaces. Avoid pills, soft cards, gradients, and shadows.
- Rhythm: 8px spacing base, generous 96px section rhythm, 1px frost (`#e5edf5`) dividers.

## Interaction

- Primary actions are indigo fills with white labels.
- Secondary actions are transparent with lavender hairline borders.
- Links use indigo and a restrained directional arrow.
- Motion is brief and functional: 180–280ms, opacity and small positional shifts only. Springs use bounce 0.
- Respect reduced-motion preferences.

## Product constraints

- Preserve the current learning engine and honest limitations.
- Keep the student illustration as Kelus-owned identity, but do not add decorative imagery.
- Prefer visible product evidence over additional marketing sections.
- Every mobile layout must work at 320, 375, 414, and 768px without horizontal overflow.
