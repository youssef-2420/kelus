"use client";

import { motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";

/** The hero's visual anchor: a tactile revision desk, not another product UI. */
export function ExamRoutePoster() {
  const reduce = useReducedMotion() === true;

  return (
    <motion.figure
      className="exam-route-poster folio-hero-notion revision-still-life"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : kelusDuration.moderate, ease: kelusEase }}
      aria-label="A desk with annotated revision notes, an exam paper, and a marked next topic"
    >
      <svg className="exam-route-art revision-still-life-art" viewBox="0 0 760 620" role="presentation">
        <path d="M0 475h760" stroke="#c9c3bb" strokeWidth="2" />

        <path d="M618 48v195" stroke="#173f3b" strokeWidth="8" strokeLinecap="round" />
        <path d="M616 235c-54 2-94 21-112 56h224c-18-35-58-54-112-56Z" fill="#ffb110" stroke="#173f3b" strokeWidth="7" strokeLinejoin="round" />
        <path d="M557 292h118" stroke="#173f3b" strokeWidth="7" strokeLinecap="round" />
        <path d="M558 292 500 475M674 292l58 183" stroke="#173f3b" strokeWidth="7" strokeLinecap="round" />
        <path d="M484 475h266" stroke="#173f3b" strokeWidth="8" strokeLinecap="round" />

        <g transform="translate(132 164) rotate(-5)">
          <path d="M0 28 222 0l38 264L38 294Z" fill="#fffdf8" stroke="#173f3b" strokeWidth="5" />
          <path d="m222 0 196 30-38 264-160-30Z" fill="#fffdf8" stroke="#173f3b" strokeWidth="5" />
          <path d="M222 6 260 264" stroke="#c9c3bb" strokeWidth="3" />
          <path d="M39 75 190 56M46 106l132-17M52 137l126-17M59 168l108-15" stroke="#a8aaa4" strokeWidth="5" strokeLinecap="round" />
          <path d="M283 83 375 98M278 115l102 16M273 147l84 14" stroke="#a8aaa4" strokeWidth="5" strokeLinecap="round" />
          <path d="m70 222 46 21 74-96" fill="none" stroke="#f64932" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m302 198 72-42" stroke="#173f3b" strokeWidth="8" strokeLinecap="round" />
          <circle cx="350" cy="213" r="17" fill="#ffb110" />
        </g>

        <g transform="translate(390 115) rotate(7)">
          <rect width="164" height="224" rx="3" fill="#fffdf8" stroke="#173f3b" strokeWidth="5" />
          <path d="M25 36h92M25 55h112M25 74h72" stroke="#7c827d" strokeWidth="5" strokeLinecap="round" />
          <path d="M25 111h107M25 130h119M25 149h105" stroke="#b2b4ae" strokeWidth="4" strokeLinecap="round" />
          <path d="m118 181 13 14 28-43" fill="none" stroke="#f64932" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <path d="m91 485 285-190" stroke="#173f3b" strokeWidth="12" strokeLinecap="round" />
        <path d="m79 494 22-9-12-17Z" fill="#ffb110" stroke="#173f3b" strokeWidth="4" strokeLinejoin="round" />
        <path d="M384 328c21-30 51-38 78-18 20 15 29 40 16 57-12 15-37 10-50-8l-18-24" fill="#f6d5b8" stroke="#173f3b" strokeWidth="5" strokeLinecap="round" />

        <g transform="translate(55 388) rotate(4)">
          <rect width="180" height="86" fill="#ffb110" stroke="#173f3b" strokeWidth="4" />
          <path d="M19 31h104M19 52h78" stroke="#173f3b" strokeWidth="6" strokeLinecap="round" />
          <circle cx="148" cy="43" r="15" fill="#f64932" />
          <path d="m141 43 6 6 11-14" fill="none" stroke="#fffdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <path d="M76 104c22-24 55-28 77-11M79 112l-3-18M153 99l13-6" fill="none" stroke="#f64932" strokeWidth="5" strokeLinecap="round" />
        <path d="M31 548c126 13 241 14 353 2" fill="none" stroke="#c9c3bb" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </motion.figure>
  );
}
