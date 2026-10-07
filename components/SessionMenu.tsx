"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./SessionMenu.module.css";

export type SessionMenuItem = {
  label: string;
  /** Shown before acting, in place of the menu, for anything that cannot be undone. */
  confirm?: { question: string; yes: string };
  danger?: boolean;
  onSelect: () => void;
};

/**
 * Everything that is not the question lives behind one quiet "More": peek at the notes, remove a topic, discard
 * the block. It opens from the button it belongs to, closes on Escape or a click outside, and asks before anything
 * that cannot be undone.
 */
export function SessionMenu({ items }: { items: SessionMenuItem[] }) {
  const reduce = useReducedMotion() === true;
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<SessionMenuItem | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { close(); button.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function close() { setOpen(false); setAsking(null); }

  function choose(item: SessionMenuItem) {
    if (item.confirm && asking !== item) { setAsking(item); return; }
    close();
    item.onSelect();
  }

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={button}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={id}
        aria-label="More session options"
        onClick={() => (open ? close() : setOpen(true))}
      >
        More
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={id}
            className={styles.panel}
            role="group"
            aria-label={asking ? asking.confirm?.question : "Session options"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 }}
            transition={reduce ? { duration: 0.1 } : { type: "spring", bounce: 0, duration: 0.22 }}
          >
            {asking?.confirm ? (
              <div className={styles.confirm}>
                <p>{asking.confirm.question}</p>
                <div>
                  <button type="button" className={styles.keep} onClick={() => setAsking(null)}>Keep</button>
                  <button type="button" className={styles.yes} onClick={() => choose(asking)} autoFocus>{asking.confirm.yes}</button>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <button key={item.label} type="button" className={`${styles.item}${item.danger ? ` ${styles.danger}` : ""}`} onClick={() => choose(item)}>
                  {item.label}
                </button>
              ))
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
