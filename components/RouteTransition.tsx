"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() === true;

  return (
    <motion.div
      key={pathname}
      className="route-transition"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.1 } : transition}
    >
      {children}
    </motion.div>
  );
}
