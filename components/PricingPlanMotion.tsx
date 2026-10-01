"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function PricingPlanMotion({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <motion.div
      className="pricing-plan-shell"
      role="listitem"
      initial={false}
      whileHover={reduceMotion ? undefined : { scale: 1.018 }}
      transition={{ type: "spring", bounce: 0, duration: 0.26 }}
    >
      {children}
    </motion.div>
  );
}
