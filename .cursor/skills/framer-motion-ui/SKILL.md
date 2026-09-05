---
name: framer-motion-ui
alwaysApply: true
description: DEFAULT Kelus motion skill (with apple-design). Use for every UI/UX tweak that involves motion, transitions, hover, press, scroll, or presence. Production Motion (`motion/react`, not `framer-motion`). Bounce 0. Respect reduced motion.
---

# Framer Motion UI

**Kelus default, paired with `apple-design`.** Bounce 0. Import from `motion/react`.

Source: [AtlasNexusTech/framer-motion-ui](https://github.com/AtlasNexusTech/framer-motion-ui)

Kelus already has `motion`. Import:

```tsx
import { motion, AnimatePresence, useInView, useScroll, useTransform, useSpring, useReducedMotion } from "motion/react";
```

Reusable wrappers live in `@/components/motion`.

## Philosophy

Animation should:

1. **Guide attention** — lead the eye to what matters
2. **Communicate state** — loading, success, error, transition
3. **Create continuity** — make navigation feel spatial
4. **Delight without distracting** — subtle > excessive

On Kelus, skip bounce. Use `type: "spring", bounce: 0` or ease `[0.22, 1, 0.36, 1]`.

## Core primitives

### `motion.*`

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
>
  Content
</motion.div>
```

### Variants

```tsx
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};
```

### `AnimatePresence`

Wrap every conditional mount. Set `exit` and a unique `key`. Use `mode="wait"` for page-style swaps.

## Patterns

- **Entrance:** opacity + y, 0.5–0.6s, easeOut / custom bezier
- **Scroll reveal:** `useInView(ref, { once: true, margin: "-100px" })` — or `<Reveal>`
- **Hover/tap:** `whileHover` / `whileTap` with spring, stiffness ~400, damping ~17, **bounce 0**
- **Layout:** `layout` on lists that reflow; do not animate width/height/top/left
- **Counter:** `useMotionValue` + `useSpring` / `animate()`, or Magic UI `NumberTicker`

## Performance

Animate only **transform + opacity** (`x`, `y`, `scale`, `rotate`, `opacity`).

Always gate with `useReducedMotion()`:

```tsx
const reduce = useReducedMotion();
<motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} />
```

## Checklist

- [ ] `AnimatePresence` wraps conditional renders
- [ ] `exit` on every child inside it
- [ ] Unique `key` on list items
- [ ] Transform/opacity only (or `layout` for reflow)
- [ ] `useReducedMotion()` respected
- [ ] Springs for press/hover; no bounce on Kelus
- [ ] Stagger lists of 3+ items
