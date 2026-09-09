"use client";

import { motion, useReducedMotion } from "motion/react";

const COLUMNS = [
  {
    id: "revise",
    label: "To revise",
    tone: "violet",
    count: 6,
    cards: ["Osmosis", "Membrane transport", "Water potential", "Enzyme kinetics"],
  },
  {
    id: "recall",
    label: "Recalling",
    tone: "amber",
    count: 4,
    cards: ["Cell respiration", "ATP yield", "Glycolysis steps"],
  },
  {
    id: "check",
    label: "Checking",
    tone: "blue",
    count: 2,
    cards: ["Homeostasis feedback", "Negative loops"],
  },
  {
    id: "strong",
    label: "Strong",
    tone: "green",
    count: 9,
    cards: ["Diffusion basics", "Exam timing", "Cell structure", "Mitosis overview"],
  },
] as const;

const SIDE_LINKS = [
  { label: "Today’s route", icon: "◎" },
  { label: "Materials", icon: "▣" },
  { label: "Knowledge map", icon: "⬡" },
] as const;

const COURSES = [
  { label: "Molecular Biology", tone: "indigo" },
  { label: "Computer science", tone: "rose" },
  { label: "History", tone: "amber" },
] as const;

/** Decorative Notion-style workspace mock for the homepage hero. */
export function NotionRevisionBoard() {
  const reduce = useReducedMotion() === true;

  return (
    <motion.div
      className="notion-board"
      aria-hidden="true"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="notion-board-chrome">
        <span /><span /><span />
      </div>

      <div className="notion-board-shell">
        <aside className="notion-board-rail">
          <div className="notion-rail-home">
            <strong>Kelus</strong>
            <span className="notion-rail-badges">
              <i className="is-alert">3</i>
              <i aria-hidden="true">⌕</i>
            </span>
          </div>
          <p className="notion-rail-label">Workspace</p>
          <ul>
            {SIDE_LINKS.map((item) => (
              <li key={item.label}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
          <p className="notion-rail-label">Courses</p>
          <ul>
            {COURSES.map((item) => (
              <li key={item.label}>
                <em className={`notion-swatch is-${item.tone}`} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
          <p className="notion-rail-label">Private</p>
          <ul>
            <li><span aria-hidden="true">◻</span> Exam notes</li>
            <li><span aria-hidden="true">◻</span> Weak topics</li>
          </ul>
          <div className="notion-rail-compose">
            <span>New session</span>
            <kbd>⌘N</kbd>
          </div>
        </aside>

        <div className="notion-board-main">
          <header className="notion-board-head">
            <div>
              <p className="notion-board-kicker">Exam prep</p>
              <h2>
                <em className="notion-page-mark" aria-hidden="true" />
                Molecular Biology
              </h2>
            </div>
            <div className="notion-board-actions">
              <span>Share</span>
              <button type="button" tabIndex={-1}>New</button>
            </div>
          </header>

          <div className="notion-board-tabs" role="presentation">
            <span className="is-active">Today’s route</span>
            <span>Weak topics</span>
            <span>Calendar</span>
            <span>Map</span>
          </div>

          <div className="notion-board-cols">
            {COLUMNS.map((column) => (
              <div key={column.id} className="notion-col">
                <div className="notion-col-head">
                  <i className={`notion-dot is-${column.tone}`} aria-hidden="true" />
                  <strong>{column.label}</strong>
                  <span>{column.count}</span>
                </div>
                <ul>
                  {column.cards.map((card) => (
                    <li key={card}>{card}</li>
                  ))}
                </ul>
                <p className="notion-col-new">+ New page</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="notion-doodles" aria-hidden="true">
        <svg className="notion-doodle is-figure" viewBox="0 0 120 160" fill="none">
          <path d="M58 28c8 0 14 7 14 16s-6 16-14 16-14-7-14-16 6-16 14-16Z" stroke="#1a1a1a" strokeWidth="2.2" />
          <path d="M42 62c4 22 10 38 16 54M78 62c-3 20-8 36-14 54" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M36 78c12 6 28 8 44 2" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M48 118c-10 18-18 28-28 34M72 118c12 16 22 28 34 36" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M94 98c10-4 18-2 22 6" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="102" cy="108" r="3" fill="#1a1a1a" />
        </svg>
        <svg className="notion-doodle is-clock" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="34" r="18" stroke="#e67e22" strokeWidth="2.4" />
          <path d="M32 34V24M32 34l8 5" stroke="#e67e22" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 14h16M28 10h8" stroke="#e67e22" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <svg className="notion-doodle is-bulb" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="22" fill="#fde8e8" stroke="#e74c3c" strokeWidth="2" />
          <path d="M28 16c6 0 10 4 10 10 0 4-2 7-5 9v4H23v-4c-3-2-5-5-5-9 0-6 4-10 10-10Z" stroke="#e74c3c" strokeWidth="2" />
          <path d="M24 41h8M25 44h6" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg className="notion-doodle is-check" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="22" fill="#eee8ff" stroke="#7c5cff" strokeWidth="2" />
          <path d="M18 29l7 7 14-16" stroke="#7c5cff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="notion-doodle is-folder" viewBox="0 0 56 48" fill="none">
          <path d="M6 14h16l4 4h24v22H6V14Z" fill="#e8f3ff" stroke="#3b82f6" strokeWidth="2" />
          <path d="M6 18h44" stroke="#3b82f6" strokeWidth="2" />
        </svg>
        <svg className="notion-doodle is-duck" viewBox="0 0 48 40" fill="none">
          <ellipse cx="22" cy="24" rx="14" ry="10" stroke="#1a1a1a" strokeWidth="2" />
          <circle cx="34" cy="14" r="7" stroke="#1a1a1a" strokeWidth="2" />
          <path d="M40 14h6" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="36" cy="13" r="1.2" fill="#1a1a1a" />
        </svg>
        <svg className="notion-doodle is-scribble" viewBox="0 0 80 80" fill="none">
          <path d="M10 40c12-18 28-22 40-10 10 10 8 28-6 34-12 5-26-2-28-14" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}
