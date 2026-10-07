"use client";

import { useState } from "react";
import styles from "./ExamDateCard.module.css";

/** Asked after the first run, when the question has a reason: it sets the countdown, the pace and the daily reminder. */
export function ExamDateCard({ onSave }: { onSave: (date: string, targetPercent: number) => void }) {
  const [date, setDate] = useState("");
  const [aim, setAim] = useState(80);
  const [error, setError] = useState("");
  const [tomorrow] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  function save() {
    if (!date) return setError("Pick the day of your exam.");
    try {
      onSave(date, aim);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Choose a date in the future.");
    }
  }

  return (
    <section className={styles.card} aria-labelledby="exam-date-title">
      <h2 id="exam-date-title">When is your exam?</h2>
      <p>It sets your countdown, how many topics a day you need, and the readiness you’re aiming for. You can skip it for now.</p>
      <div className={styles.row}>
        <label>
          <span>Exam date</span>
          <input type="date" value={date} min={tomorrow} onChange={(event) => { setDate(event.target.value); setError(""); }} />
        </label>
        <label>
          <span>Aim for</span>
          <select value={aim} onChange={(event) => setAim(Number(event.target.value))}>
            {[60, 70, 80, 90].map((value) => <option key={value} value={value}>{value}% ready</option>)}
          </select>
        </label>
        <button type="button" onClick={save}>Save date</button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
