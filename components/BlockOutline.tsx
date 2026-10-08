"use client";

import { motion, useReducedMotion } from "motion/react";
import type { RetrievalOutcome } from "@/domain/types";
import styles from "./BlockOutline.module.css";

export type OutlineTopic = { id: string; name: string; outcome: RetrievalOutcome | null; current: boolean };

/** Partly there is a half-filled dot everywhere in Kelus, never a minus. */
const HALF = <svg viewBox="0 0 16 16" width="11" height="11" style={{ display: "block" }}><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 1.75A6.25 6.25 0 0 0 8 14.25Z" fill="currentColor" /></svg>;
const MARK: Record<RetrievalOutcome, React.ReactNode> = { success: "✓", partial: HALF, failure: "↻" };
const WORD: Record<RetrievalOutcome, string> = { success: "Solid pass", partial: "Partly there", failure: "Needs another attempt" };

/**
 * On a wide screen, the margin beside the question shows where you are in the block: topics done with their
 * outcome, the one you're on, and what's left. Like a page outline: quiet, and only there when there is room.
 */
export function BlockOutline({ course, topics }: { course: string; topics: OutlineTopic[] }) {
  const reduce = useReducedMotion() === true;
  if (topics.length < 2) return null;
  return (
    <nav className={styles.outline} aria-label="This block">
      <p className={styles.course}>{course}</p>
      <p className={styles.label}>This block</p>
      <ol>
        {topics.map((topic, index) => (
          <motion.li
            key={topic.id}
            className={[topic.current ? styles.current : null, topic.outcome ? styles[topic.outcome] : null, !topic.current && !topic.outcome ? styles.ahead : null].filter(Boolean).join(" ")}
            aria-current={topic.current ? "step" : undefined}
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, delay: index * 0.03 }}
          >
            <span className={styles.mark} aria-hidden="true">{topic.outcome ? MARK[topic.outcome] : topic.current ? "" : index + 1}</span>
            <span className={styles.name}>{topic.name}</span>
            {topic.outcome ? <span className="sr-only">{WORD[topic.outcome]}</span> : topic.current ? <span className="sr-only">Now</span> : null}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
}
