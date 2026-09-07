# Kelus agent defaults

## Design system

`design.md` is the default visual system and product flow.

- Indigo ledger (white canvas, midnight ink, one indigo accent, Inter Tight, 4px radii, no shadows)
- Persistent `SiteHeader` on every page
- Homepage: hero → Start here journey → V1 product story
- Product entry: `/today`

Do not revert to cream paper, Kelus green, or a serif display face unless asked.
Do not invent a replacement token set.

## UI and UX

Primary skills for interaction and motion:

1. `apple-design` — `.cursor/skills/apple-design/SKILL.md`
2. `framer-motion-ui` — `.cursor/skills/framer-motion-ui/SKILL.md`

Load both before changing interface, motion, or copy. Visual tokens still come from `design.md` / `tokens.css`, not from those skills.

Do not use `shadcn` as the homepage or product visual system. Use it only when the task is explicitly about shadcn/ui, the registry, or `components.json`.

Do not rebuild or remove the student hero, Start here journey, or V1 product story unless the user asks to.
