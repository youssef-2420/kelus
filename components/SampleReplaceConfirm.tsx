"use client";

import { useEffect, useRef } from "react";
import styles from "./SampleReplaceConfirm.module.css";

/** Your own file never mixes into the built-in sample: it starts your own course, and the sample is replaced. */
export function SampleReplaceConfirm({ fileName, onConfirm, onCancel }: { fileName: string; onConfirm: () => void; onCancel: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="sample-replace-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="sample-replace-title">Start your own course?</h2>
        <p>
          This is the built-in Microeconomics sample. “{fileName}” will start your own course instead, so the sample and your notes never mix.
          You’ll set your exam date next.
        </p>
        <div className={styles.actions}>
          <button ref={confirmRef} type="button" className={`k-btn ${styles.primary}`} onClick={onConfirm}>Start my own course</button>
          <button type="button" className={styles.link} onClick={onCancel}>Keep the sample</button>
        </div>
      </div>
    </div>
  );
}
