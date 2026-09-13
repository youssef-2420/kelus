# Codex task — elevate Kelus from 9.5 → ~10 (craft only)

You are working in the Kelus repo. Read `CODEX.md`, `AGENTS.md`, `.cursor/skills/apple-design/SKILL.md`, and `.cursor/skills/framer-motion-ui/SKILL.md` before editing UI.

## Why this pass exists
A Cursor cloud agent already shipped booklet paper, Microeconomics sample alignment, map label fixes, and product-shell rename (`is-booklet-product`). Live grade is **~9.5**. The remaining gap is **craft debt**, not a new look.

Do **not** redesign the brand, hero concept, or color system. Do **not** open Superdesign / shadcn / generative mockups. Those would not elevate Kelus — they would dilute it.

## Goal
Clear the three residual caps that still keep the product off a clean 10:

### 1) Kill remaining `notion-*` naming on the marketing + system surface
Home still ships leftover Notion-era classes, e.g.:
- `body.is-notion-system` in `app/layout.tsx`
- `is-notion`, `folio-hero-notion`, `notion-board`, `notion-flow*` on the home board/hero

Rename to booklet vocabulary across **TSX + CSS** (mechanical, careful):
- `is-notion-system` → `is-booklet-system` (or keep one compatibility alias for one release if needed, then delete)
- `notion-board` → `booklet-board` (or `notebook-board` if that matches existing notebook chrome)
- `notion-flow*` → `booklet-flow*` / `revision-flow*`
- Prefer renaming `app/notion-product.css` / `app/notion-paper.css` imports/filenames only if you can do it without breaking the CSS load order in `app/layout.tsx` (booklet sheet must stay last among visual layers before view-transitions).

Acceptance:
- `rg -n "notion-board|notion-flow|is-notion[^-]|folio-hero-notion" --glob '*.{tsx,css}'` is empty (or only a short deprecated alias comment).
- Live/home DOM no longer exposes `notion-board` / `notion-flow` class names.
- Visual unchanged: same paper, same board, same Microeconomics sample.

### 2) Hero `h1` accessibility join
Current textContent concatenates lines:
`Revise your lessons.Walk into the exam ready.`

Fix so screen readers hear a normal sentence boundary (space, `<br>`, or two elements with accessible separation) while keeping the visual two-line poster layout (`hero-line-break` may stay).

Acceptance:
- `document.querySelector('h1')?.textContent` includes a break/space between the two clauses.
- Visual line break on desktop + mobile unchanged.

### 3) Header chrome
Product/home `site-header` still carries a soft multi-layer shadow on some surfaces. Flatten to booklet: paper wash + hairline rule, **no SaaS shadow stack**.

Acceptance:
- Computed `box-shadow` on `.site-header` is `none` (or a single hairline-equivalent with negligible blur — prefer none).

## Out of scope
- New illustration systems, purple themes, cream paper, card grids, pill clusters
- Changing pricing model, auth, or learner model
- Rebuilding Today / Map layouts from scratch
- “Make it pop” motion; keep bounce 0, transform/opacity only

## Implementation notes
- Branch: `cursor/booklet-craft-444f` from latest `main`.
- Keep CSS load order: … `notion-*` (or renamed) sheets, then `exam-booklet.css` last among visual layers.
- After edits: `npm test`, `npx tsc --noEmit`, local Playwright checks on `/`, `/today/?sample=1`, `/map`, `/materials` (fresh context).
- Commit with a clear message, push, open PR to `main`, wait for CI, then ship (FF-merge + Restore kelus.me).

## Done when
You can defend a **≥9.8** live grade because:
1. No user-facing `notion-*` class residue on home/product
2. Hero h1 reads cleanly to AT
3. Header has no soft SaaS shadow
4. Microeconomics sample + map spine + booklet paper still hold

If something conflicts with the booklet system, prefer **restraint** over novelty.
