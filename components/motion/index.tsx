"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Transition } from "motion/react";
import { type ReactNode } from "react";

/** Shared motion constants — bounce always 0 on Kelus. */
export const kelusEase = [0.22, 1, 0.36, 1] as const;

export const kelusMotion = {
  ease: kelusEase,
  enter: { duration: 0.45, ease: kelusEase } satisfies Transition,
  quick: { duration: 0.22, ease: kelusEase } satisfies Transition,
  reveal: { duration: 0.55, ease: kelusEase } satisfies Transition,
  press: { type: "spring", stiffness: 420, damping: 28, bounce: 0 } as const,
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
      transition={reduce ? { duration: 0.01 } : { ...kelusMotion.reveal, delay }}
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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: kelusEase } },
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

  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : list}
      initial={false}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
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
