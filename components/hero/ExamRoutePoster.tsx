"use client";

import { motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";

/**
 * Full-bleed route poster — the visual anchor for the first viewport.
 * Not a UI mock: ink path through topics toward the exam.
 */
export function ExamRoutePoster() {
  const reduce = useReducedMotion() === true;

  return (
    <motion.figure
      className="exam-route-poster folio-hero-notion"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : kelusDuration.moderate, ease: kelusEase }}
      aria-label="A revision route toward an exam: Osmosis, Respiration, then Homeostasis"
    >
      <svg className="exam-route-art" viewBox="0 0 640 720" role="presentation">
        <defs>
          <linearGradient id="posterWash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a1650" />
            <stop offset="55%" stopColor="#02093a" />
            <stop offset="100%" stopColor="#04102f" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="640" height="720" fill="url(#posterWash)" />

        {/* Paper scrap */}
        <g transform="translate(72 86) rotate(-4)">
          <rect width="210" height="150" fill="#f6f1e6" stroke="#e8dcc6" strokeWidth="2" />
          <path d="M18 36h160M18 58h140M18 80h150M18 102h90" stroke="#c4b8a4" strokeWidth="3" strokeLinecap="round" />
          <circle cx="168" cy="118" r="10" fill="#ffb110" />
          <text x="22" y="28" fill="#6b6560" fontSize="14" fontFamily="Georgia, serif">Week 3 notes</text>
        </g>

        {/* Route path */}
        <path
          d="M120 280C210 250 280 320 340 300C420 272 460 360 520 340C560 328 580 380 600 420"
          fill="none"
          stroke="#ffb110"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#softGlow)"
        />
        <path
          d="M120 280C210 250 280 320 340 300C420 272 460 360 520 340C560 328 580 380 600 420"
          fill="none"
          stroke="#fff4d0"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Stops */}
        <g>
          <circle cx="120" cy="280" r="14" fill="#f6f1e6" stroke="#ffb110" strokeWidth="3" />
          <text x="148" y="276" fill="#f6f1e6" fontSize="22" fontFamily="Georgia, serif">Osmosis</text>
          <text x="148" y="300" fill="#9bb0d8" fontSize="13" fontFamily="ui-sans-serif, system-ui, sans-serif">18 min · again</text>
        </g>
        <g>
          <circle cx="340" cy="300" r="12" fill="#02093a" stroke="#62aef0" strokeWidth="3" />
          <text x="362" y="296" fill="#e6f3fe" fontSize="20" fontFamily="Georgia, serif">Respiration</text>
          <text x="362" y="318" fill="#7f95c0" fontSize="13" fontFamily="ui-sans-serif, system-ui, sans-serif">15 min</text>
        </g>
        <g>
          <circle cx="520" cy="340" r="12" fill="#02093a" stroke="#62aef0" strokeWidth="3" />
          <text x="430" y="380" fill="#e6f3fe" fontSize="20" fontFamily="Georgia, serif">Homeostasis</text>
          <text x="430" y="402" fill="#7f95c0" fontSize="13" fontFamily="ui-sans-serif, system-ui, sans-serif">12 min</text>
        </g>

        {/* Exam mark */}
        <g transform="translate(420 470)">
          <rect width="170" height="78" rx="4" fill="#f64932" />
          <text x="18" y="34" fill="#fff4f0" fontSize="14" fontFamily="ui-sans-serif, system-ui, sans-serif" letterSpacing="0.08em">EXAM</text>
          <text x="18" y="60" fill="#ffffff" fontSize="26" fontFamily="Georgia, serif">12 days</text>
        </g>

        {/* Sticky */}
        <g transform="translate(70 520) rotate(3)">
          <rect width="150" height="110" fill="#fff4d0" />
          <text x="16" y="36" fill="#5c4a18" fontSize="16" fontFamily="Georgia, serif">Recall first.</text>
          <text x="16" y="62" fill="#5c4a18" fontSize="16" fontFamily="Georgia, serif">Then check.</text>
          <text x="16" y="88" fill="#5c4a18" fontSize="16" fontFamily="Georgia, serif">Then reroute.</text>
        </g>
      </svg>
    </motion.figure>
  );
}
