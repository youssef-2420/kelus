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
          initial={false}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </picture>
    </figure>
  );
}
