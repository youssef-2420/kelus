"use client";

import styles from "./ReadingNotes.module.css";

/** The only thing on screen while Kelus reads a file: what it is doing, or why it could not, and one way out. */
export function ReadingNotes({ message, error, onStartOver }: { message: string; error?: string | null; onStartOver?: () => void }) {
  if (error) {
    return (
      <section className={styles.box} aria-labelledby="reading-title">
        <h1 id="reading-title">Kelus couldn’t find topics in this file.</h1>
        <p>{error}</p>
        <p className={styles.hint}>Notes with a heading above each topic work best. A PDF needs selectable text, or a clear scan.</p>
        <button type="button" className={styles.cta} onClick={onStartOver}>Try another file</button>
      </section>
    );
  }
  return (
    <section className={styles.box} role="status" aria-live="polite" aria-labelledby="reading-title">
      <span className={styles.pulse} aria-hidden="true" />
      <h1 id="reading-title">Reading your notes…</h1>
      <p>{message}</p>
    </section>
  );
}
