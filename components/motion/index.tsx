"use client";

import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useRef, type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children">;

export function Reveal({ children, className, delay = 0, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() === true;
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, delay, ease }}
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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
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
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() === true;
  const inView = useInView(ref, { once, margin: "-12% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={reduce ? undefined : list}
      initial={reduce ? false : "hidden"}
      animate={reduce || inView ? "show" : "hidden"}
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

const pressSpring = { type: "spring" as const, stiffness: 400, damping: 28, bounce: 0 };

export function Pressable({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion() === true;
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={pressSpring}
    >
      {children}
    </motion.div>
  );
}
