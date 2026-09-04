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
        animate={reduce ? undefined : { y: [0, 0.8, 0] }}
        transition={reduce ? undefined : { duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="hero-notebook">
        <span className="hero-page-left" />
        <span className="hero-page-right" />
        {reduce ? null : (
          <span className="hero-page is-turning">
            <span className="hero-page-front" />
            <span className="hero-page-back" />
          </span>
        )}
      </div>
    </figure>
  );
}
