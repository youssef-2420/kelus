"use client";

import { motion, useReducedMotion } from "motion/react";

const SIDE_LINKS = [
  { label: "Today’s route", icon: "◎" },
  { label: "Recall check", icon: "◇" },
  { label: "Weak topics", icon: "▣" },
] as const;

const COURSES = [
  { label: "Molecular Biology", tone: "indigo", active: true },
  { label: "Data Structures", tone: "rose", active: false },
  { label: "Modern History", tone: "amber", active: false },
] as const;

const ROUTE = [
  { name: "Osmosis", minutes: 18, reason: "Recall was uncertain", recommended: true },
  { name: "Cell respiration", minutes: 15, reason: "High exam value", recommended: false },
  { name: "Homeostasis", minutes: 12, reason: "Builds on both", recommended: false },
] as const;

/**
 * Decorative Notion-style workspace mock for the homepage hero.
 * Mirrors the real Kelus loop (recall → check → route), not a fake kanban.
 */
export function NotionRevisionBoard() {
  const reduce = useReducedMotion() === true;

  return (
    <motion.div
      className="notion-board is-honest-flow"
      aria-hidden="true"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="notion-board-shell">
        <div className="notion-board-chrome">
          <span /><span /><span />
        </div>
        <aside className="notion-board-rail">
          <div className="notion-rail-home">
            <strong>Kelus</strong>
            <span className="notion-rail-badges">
              <i className="is-alert">1</i>
            </span>
          </div>
          <p className="notion-rail-label">Session</p>
          <ul>
            {SIDE_LINKS.map((item) => (
              <li key={item.label} className={item.label === "Today’s route" ? "is-active" : undefined}>
                <span>{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
          <p className="notion-rail-label">Courses</p>
          <ul>
            {COURSES.map((item) => (
              <li key={item.label} className={item.active ? "is-active" : undefined}>
                <em className={`notion-swatch is-${item.tone}`} />
                {item.label}
              </li>
            ))}
          </ul>
          <div className="notion-rail-compose">
            <span>Example only</span>
            <kbd>⌘E</kbd>
          </div>
        </aside>

        <div className="notion-board-main">
          <header className="notion-board-head">
            <div>
              <p className="notion-board-kicker">Interactive shape · not saved</p>
              <h2>
                <em className="notion-page-mark" />
                Molecular Biology
              </h2>
            </div>
          </header>

          <div className="notion-board-tabs" role="presentation">
            <span className="is-active">01 Recall</span>
            <span>02 Check</span>
            <span>03 Route</span>
          </div>

          <div className="notion-flow">
            <div className="notion-flow-recall">
              <p className="notion-flow-label">Try answering in your head</p>
              <p className="notion-flow-question">
                Why does water move across a selectively permeable membrane?
              </p>
              <div className="notion-flow-reveal">
                Reveal answer
                <span>+</span>
              </div>
            </div>

            <div className="notion-flow-route">
              <div className="notion-flow-route-title">
                <span>Today’s route</span>
                <strong>Example · 45 minutes</strong>
              </div>
              <ul>
                {ROUTE.map((item, index) => (
                  <li key={item.name} className={item.recommended ? "is-recommended" : undefined}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.reason}</small>
                    </div>
                    <b>{item.minutes} min</b>
                  </li>
                ))}
              </ul>
              <p className="notion-flow-signal">
                <span>↳</span>
                Osmosis moved first after an uncertain recall answer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Earned accents only — anchored to the real loop, not scattered sticker clutter */}
      <div className="notion-doodles">
        <svg className="notion-doodle is-check" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="22" fill="#eee8ff" stroke="#7c5cff" strokeWidth="2" />
          <path d="M18 29l7 7 14-16" stroke="#7c5cff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="notion-doodle is-scribble" viewBox="0 0 80 80" fill="none">
          <path d="M10 40c12-18 28-22 40-10 10 10 8 28-6 34-12 5-26-2-28-14" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}
