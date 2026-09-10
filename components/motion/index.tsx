"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Transition } from "motion/react";
import { type ReactNode } from "react";

/**
 * Notion-inspired motion: fast, quiet, functional.
 * No bounce, no elastic overshoot, no cinematic timing.
 * Standard ease: cubic-bezier(0.4, 0, 0.2, 1)
 * Inclusive: prefer opacity over travel; honour prefers-reduced-motion.
 */

/** Duration tokens (seconds for Motion; CSS uses ms equivalents). */
export const kelusDuration = {
  instant: 0.08,
  micro: 0.1,
  fast: 0.15,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.4,
} as const;

/** Standard state-transition easing — cubic-bezier(0.4, 0, 0.2, 1) */
export const kelusEase = [0.4, 0, 0.2, 1] as const;

export const kelusMotion = {
  ease: kelusEase,
  duration: kelusDuration,
  /** Default UI transition */
  normal: { duration: kelusDuration.normal, ease: kelusEase } satisfies Transition,
  /** Buttons, toggles, hover */
  fast: { duration: kelusDuration.fast, ease: kelusEase } satisfies Transition,
  /** Links / icon feedback */
  micro: { duration: kelusDuration.micro, ease: kelusEase } satisfies Transition,
  /** Dropdowns, cards, tooltips */
  enter: { duration: kelusDuration.normal, ease: kelusEase } satisfies Transition,
  /** Dialogs, drawers, layout */
  moderate: { duration: kelusDuration.moderate, ease: kelusEase } satisfies Transition,
  /** Major page / content transitions (cap) */
  slow: { duration: kelusDuration.slow, ease: kelusEase } satisfies Transition,
  /** Scroll reveals — opacity-first, moderate */
  reveal: { duration: kelusDuration.normal, ease: kelusEase } satisfies Transition,
  /** Press feedback — instant, no bounce */
  press: { duration: kelusDuration.micro, ease: kelusEase } satisfies Transition,
  /** Alias kept for older call sites */
  quick: { duration: kelusDuration.fast, ease: kelusEase } satisfies Transition,
} as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children">;

export function Reveal({ children, className, delay = 0, ...rest }: RevealProps) {
  const reduce = useReducedMotion() === true;

  // Reduced motion: show content immediately — no scroll-triggered travel.
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -40px 0px" }}
      transition={{ ...kelusMotion.reveal, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const list = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: kelusDuration.micro, delayChildren: kelusDuration.instant },
  },
};

const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: kelusMotion.normal },
};

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion() === true;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={list}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion() === true;
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

export function Pressable({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion() === true;
  return (
    <motion.div
      className={className}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={kelusMotion.press}
    >
      {children}
    </motion.div>
  );
}
