"use client";

import { motion, useReducedMotion } from "motion/react";
import type { RetrievalOutcome } from "@/domain/types";
import styles from "./BlockOutline.module.css";

export type OutlineTopic = { id: string; name: string; outcome: RetrievalOutcome | null; current: boolean };

const MARK: Record<RetrievalOutcome, string> = { success: "✓", partial: "–", failure: "↻" };
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
            className={topic.current ? styles.current : topic.outcome ? styles[topic.outcome] : styles.ahead}
            aria-current={topic.current ? "step" : undefined}
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, delay: index * 0.04 }}
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
