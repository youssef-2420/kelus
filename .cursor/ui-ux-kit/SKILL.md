---
name: ui-ux-kit
description: "Kelus UI/UX kit index. Use for any interface design, build, redesign, audit, or polish task."
version: 1.0.0
---

# UI/UX Kit (Kelus)

Use this skill as the **entry point** for all UI and UX work on Kelus. Read this file first, then load the specialized kit that matches the task.

## When to use

- Designing or redesigning pages, components, flows
- Polishing alerts, search, product, sign-in, onboarding
- Auditing accessibility, hierarchy, motion, or mobile layout
- Preventing generic AI-slop patterns on new surfaces

## Installed kits (priority order)

| Kit | Path | Best for |
|-----|------|----------|
| **UI UX Pro Max** | `.cursor/skills/ui-ux-pro-max/SKILL.md` | Design systems, palettes, typography, UX guidelines, stack patterns |
| **Impeccable** | `.agents/skills/impeccable/SKILL.md` | Polish, animate, onboard, critique, audit, Operate-mode app UI |
| **Hallmark** | `.agents/skills/hallmark/SKILL.md` | Anti-slop guardrails, structural variety on new pages |
| **Cursor Designer rules** | `.cursor/rules/design/*.mdc` | UX flows, forms, a11y, layout density, microcopy |
| **Design Bible rules** | `.cursor/rules/design-bible/*.mdc` | UX laws, buttons, motion, anti-patterns |

Also available under `.cursor/skills/`: `design-system`, `brand`, `ui-styling`, `design`, `banner-design`, `slides`.

## Kelus-specific constraints

Before generating UI:

1. **Read existing tokens** in `app/globals.css` — forest green, Fraunces headings, paper background.
2. **Reuse components** — `KelusHeader`, `SearchControls`, `ComparisonStage`, `WatchButton`, `SignInDialog`.
3. **Operate mode** — Kelus is a task app (search → compare → track → buy), not a marketing landing page.
4. **No invented metrics** — do not add fake social proof, user counts, or savings claims.
5. **SEO is out of scope** for this kit — another agent owns SEO.

## Workflow

1. Load **ui-ux-pro-max** for palette/typography/UX guideline search when direction is unclear.
2. Load **impeccable** for polish, motion, empty states, and conversion moments.
3. Apply **design** + **design-bible** rules for forms, a11y, buttons, and anti-patterns.
4. Use **hallmark** only when building a **new** page or major section — not for small surgical fixes.

## Vendor sources (refresh)

See `.cursor/kits/README.md` for clone URLs and update commands.
