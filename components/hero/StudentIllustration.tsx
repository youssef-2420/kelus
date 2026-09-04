"use client";

import { motion, useReducedMotion } from "motion/react";

type Props = {
  className?: string;
};

export function StudentIllustration({ className }: Props) {
  const reduce = useReducedMotion() === true;

  return (
    <figure className={className} aria-hidden="true">
      <motion.img
        src="/hero/student.png"
        alt=""
        width={610}
        height={538}
        animate={reduce ? undefined : { y: [0, 1.2, 0] }}
        transition={reduce ? undefined : { duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </figure>
  );
}
