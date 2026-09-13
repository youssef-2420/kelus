# Kelus — Codex project notes

## Product
Kelus is a local-first exam revision app. Live: https://kelus.me  
Current grade after craft polish: **~9.5/10**. Goal of the elevation pass: clear remaining craft debt without inventing a new visual system.

## Non-negotiables
- Primary UI skills: `.cursor/skills/apple-design/SKILL.md` + `.cursor/skills/framer-motion-ui/SKILL.md`
- Bounce **0**. Import motion from `motion/react`.
- One accent: Kelus green. Paper is booklet `#eef1ec` (`rgb(238, 241, 236)`), not cream.
- Do **not** use shadcn / Superdesign / Figma-generate as the homepage or product system.
- Do **not** rebuild or remove the student hero, route story, or workbench unless asked.
- Sample story must stay **Microeconomics** (Elasticity / Supply & Demand) — never Molecular Biology.

## Branch / ship
- Work on `cursor/<name>-444f` off `main`.
- Commit, push, open PR via the repo’s normal PR flow, then FF-merge to `main` when CI is green.
- Live restore runs on push to `main` (`Restore kelus.me`).

## Verify
- `npm test` must stay green.
- Playwright against local or https://kelus.me: map label overlaps = 0; no Molecular/Osmosis; body bg booklet paper; no `is-notion-product` / prefer booklet naming.
