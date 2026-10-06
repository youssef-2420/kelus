"use client";

import { useState } from "react";
import styles from "./ExamDateCard.module.css";

/** Asked after the first run, when the question has a reason: it sets the countdown, the pace and the daily reminder. */
export function ExamDateCard({ onSave }: { onSave: (date: string) => void }) {
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [tomorrow] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  function save() {
    if (!date) return setError("Pick the day of your exam.");
    try {
      onSave(date);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Choose a date in the future.");
    }
  }

  return (
    <section className={styles.card} aria-labelledby="exam-date-title">
      <h2 id="exam-date-title">When is your exam?</h2>
      <p>It sets your countdown and how many topics a day you need, and lets you add a daily reminder. You can skip it for now.</p>
      <div className={styles.row}>
        <label>
          <span>Exam date</span>
          <input type="date" value={date} min={tomorrow} onChange={(event) => { setDate(event.target.value); setError(""); }} />
        </label>
        <button type="button" onClick={save}>Save date</button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
