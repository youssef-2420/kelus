"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

const sources = [
  { kind: "PDF", title: "Course syllabus", detail: "Saved on this device" },
  { kind: "LINK", title: "Lecture 04 — Elasticity", detail: "Video reference" },
  { kind: "PDF", title: "Past exam guide", detail: "Saved on this device" },
] as const;

function SourceIcon({ kind }: { kind: "PDF" | "LINK" }) {
  return kind === "PDF" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 2.75h7l4 4v14.5h-11zM13.5 2.75v4h4M9 12h6M9 16h4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.5 14.5 5-5M7.2 16.8l-1 1a3.25 3.25 0 0 0 4.6 4.6l3.1-3.1a3.25 3.25 0 0 0 0-4.6M16.8 7.2l1-1a3.25 3.25 0 0 0-4.6-4.6l-3.1 3.1a3.25 3.25 0 0 0 0 4.6" />
    </svg>
  );
}

export function MaterialShelfIllustration() {
  const reduce = useReducedMotion() === true;

  return (
    <div className="v1-materials" aria-label="Example saved course materials">
      <Image unoptimized className="material-route-art" src="/hero/material-route.webp" alt="Course notes becoming a connected study route, drawn in indigo ink." width={1000} height={667} loading="lazy" />
      <header>
        <div>
          <span>Example source shelf</span>
          <strong>Microeconomics</strong>
        </div>
        <span>3 saved</span>
      </header>
      <ul>
        {sources.map((source, index) => (
          <motion.li
            key={source.title}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.36, delay: reduce ? 0 : index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <i><SourceIcon kind={source.kind} /></i>
            <p>
              <strong>{source.title}</strong>
              <small>{source.detail}</small>
            </p>
            <span>{source.kind}</span>
          </motion.li>
        ))}
      </ul>
      <footer>
        <span aria-hidden="true">i</span>
        Confirmed PDF concepts shape the route. Saved links remain bookmarks.
      </footer>
    </div>
  );
}
