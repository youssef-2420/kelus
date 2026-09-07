# Kelus agent defaults

## UI and UX

Primary skills for this project:

1. `apple-design` — `.cursor/skills/apple-design/SKILL.md`
2. `framer-motion-ui` — `.cursor/skills/framer-motion-ui/SKILL.md`

Load both before changing interface, motion, or copy on a screen. They are the default pair for small UI/UX work.

Do not use `shadcn` as the homepage or product visual system. Use it only when the task is explicitly about shadcn/ui, the registry, or `components.json`.

Do not rebuild or remove the student hero, route story, or workbench unless the user asks to.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
