"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Transition } from "motion/react";
import { type ReactNode } from "react";

/** Shared motion constants for Fable / craft passes — bounce always 0 on Kelus. */
export const kelusEase = [0.22, 1, 0.36, 1] as const;

export const kelusMotion = {
  ease: kelusEase,
  enter: { duration: 0.45, ease: kelusEase } satisfies Transition,
  quick: { duration: 0.22, ease: kelusEase } satisfies Transition,
  reveal: { duration: 0.55, ease: kelusEase } satisfies Transition,
  press: { type: "spring", stiffness: 420, damping: 28, bounce: 0 } as const,
  sheet: { type: "spring", stiffness: 380, damping: 32, bounce: 0 } as const,
  route: { duration: 0.22, ease: kelusEase } satisfies Transition,
} as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children">;

export function Reveal({ children, className, delay = 0, ...rest }: RevealProps) {
  const reduce = useReducedMotion() === true;

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -48px 0px" }}
      transition={reduce ? { duration: 0 } : { ...kelusMotion.reveal, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Fade({
  children,
  className,
  delay = 0,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children">) {
  const reduce = useReducedMotion() === true;

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={reduce ? { duration: 0 } : { ...kelusMotion.enter, delay }}
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
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: kelusMotion.enter },
};

export function Stagger({
  children,
  className,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion() === true;

  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : list}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once, amount: 0.18 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion() === true;
  return (
    <motion.div className={className} variants={reduce ? undefined : item}>
      {children}
    </motion.div>
  );
}

export function Pressable({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion() === true;
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={kelusMotion.press}
    >
      {children}
    </motion.div>
  );
}

/** Shared enter/exit for sticky inspectors and source sheets. */
export function sheetMotion(reduce: boolean) {
  if (reduce) {
    return {
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 },
    };
  }
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: kelusMotion.sheet,
  };
}
