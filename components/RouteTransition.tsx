"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() === true;

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={pathname}
        className="route-transition"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0.1 } : transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
