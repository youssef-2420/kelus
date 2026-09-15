# UI/UX correction pass — 15 September 2026

Scope: homepage, How it works, pricing, and Today sample. No brand, auth,
marking, learner-model or routing changes.

- Header uses one “How it works” text node; Pricing remains reachable on mobile.
- Hero SVG exposes one title/description, not every drawn text fragment. Mobile
  gets a readable explanation without changing the marked-script artwork.
- “Interactive sample” replaces the ambiguous kicker. The route next to the
  question is retained: it is the interactive result, not a duplicate walkthrough.
- Demo totals derive from displayed stops (45 → 39 minutes after remembered).
  Shaky feedback says “stays first”; reveal has a permanent controlled region.
- Native pressed buttons replace incomplete tabs on the course-example selector.
- Mobile course navigation occupies one row; repeated course identity is removed
  from the rail and the first stop owns the primary start action.
- Initial Today fallback has a polite status and static loading lines, no delay.
- Site footers sit outside main while retaining marketing typography scope.
- Narrow question-bank limitations remain visible without opening topic details.
- Reveal meets the 44px touch target; CTA helper distinguishes own notes/sample.

Verification: all 110 unit tests, lint, typecheck, production build, and all 15
Playwright tests passed. Built pages rendered at 390×844 and 1440×1000 with no
horizontal overflow. Keyboard course selection, demo outcomes, footer landmarks,
mobile start action, and marketing/app font separation have browser regressions.

Known remaining: browser E2E emits an existing duplicate concept-title ViewTransition
name warning during the uploaded-source journey. No full assistive-technology
certification or authenticated cross-device test is claimed by this UI pass.
Existing white marketing canvas, rounded sample booklet and app typography were
preserved rather than silently reconciling them with broader design.md defaults.
