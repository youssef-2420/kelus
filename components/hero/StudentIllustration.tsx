"use client";

import { motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";

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
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : kelusDuration.moderate, ease: kelusEase }}
        />
      </picture>
    </figure>
  );
}
