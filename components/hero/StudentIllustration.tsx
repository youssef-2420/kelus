"use client";

import { motion, useReducedMotion } from "motion/react";

type Props = {
  className?: string;
};

export function StudentIllustration({ className }: Props) {
  const reduce = useReducedMotion() === true;

  return (
    <figure className={className} aria-hidden="true">
      <picture>
        <source srcSet="/hero/student.webp" type="image/webp" />
        <motion.img
          src="/hero/student.png"
          alt=""
          width={610}
          height={538}
          decoding="async"
          fetchPriority="high"
          animate={reduce ? undefined : { y: [0, -3, 0], scale: [1, 1.012, 1] }}
          transition={reduce ? undefined : { duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </picture>
    </figure>
  );
}
