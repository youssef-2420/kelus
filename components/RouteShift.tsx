"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import styles from "./RouteShift.module.css";

type Item = { id: string; name: string };

/**
 * Shows the route actually changing: topics start in their old order, then slide to the new one.
 * Only real route movement is shown; nothing here is a score.
 */
export function RouteShift({ before, after }: { before: Item[]; after: Item[] }) {
  const reduce = useReducedMotion() === true;
  const [settled, setSettled] = useState(reduce);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setSettled(true), 650);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  const order = settled ? after : before;
  const movedUp = new Set(
    after.filter((item, index) => {
      const was = before.findIndex((entry) => entry.id === item.id);
      return was > index;
    }).map((item) => item.id),
  );

  return (
    <motion.ol className={styles.list} aria-label="Remaining topics in your updated order">
      {order.map((item, index) => (
        <motion.li
          key={item.id}
          layout={reduce ? false : "position"}
          transition={{ type: "spring", bounce: 0, duration: 0.55 }}
          className={movedUp.has(item.id) && settled ? styles.moved : undefined}
        >
          <span className={styles.num} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <strong>{item.name}</strong>
          {movedUp.has(item.id) && settled ? <span className={styles.tag}>Moved up</span> : null}
        </motion.li>
      ))}
    </motion.ol>
  );
}

/** Time moving between topics, drawn as a bar that slides from the old length to the new one. */
export function MinuteShift({ changes }: { changes: Array<{ name: string; before: number; after: number }> }) {
  const reduce = useReducedMotion() === true;
  const max = Math.max(1, ...changes.flatMap((change) => [change.before, change.after]));
  return (
    <ul className={styles.minutes} aria-label="Changed study time">
      {changes.map((change) => {
        const delta = change.after - change.before;
        return (
          <li key={change.name}>
            <strong>{change.name}</strong>
            <span className={styles.bar} aria-hidden="true">
              <motion.i
                initial={reduce ? false : { width: `${(change.before / max) * 100}%` }}
                animate={{ width: `${(change.after / max) * 100}%` }}
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.7, delay: 0.25 }}
              />
            </span>
            <span className={delta > 0 ? styles.more : styles.less}>
              {change.before} → {change.after} min
            </span>
          </li>
        );
      })}
    </ul>
  );
}
