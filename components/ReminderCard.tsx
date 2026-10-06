"use client";

import { useState } from "react";
import { downloadDailyStudyIcs, REMINDER_TIMES } from "@/lib/study-reminder";
import { trackEvent } from "@/lib/analytics";
import { PackArt } from "@/components/PackArt";
import styles from "./ReminderCard.module.css";

const KEY = "kelus-reminder-time-v1";

function readTime() {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved && (REMINDER_TIMES as readonly string[]).includes(saved) ? saved : "18:00";
  } catch { return "18:00"; }
}

function label(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The return nudge. A closed website cannot notify you, so this puts a daily block, with an alert, in your own calendar. */
export function ReminderCard({ courseName, examDate, minutes, nextStopName }: { courseName: string; examDate: string; minutes: number; nextStopName?: string | null }) {
  const [time, setTime] = useState(() => (typeof window === "undefined" ? "18:00" : readTime()));
  const [added, setAdded] = useState(false);

  function add() {
    try { window.localStorage.setItem(KEY, time); } catch { /* The choice is a convenience only. */ }
    if (downloadDailyStudyIcs({ courseName, minutes, time, examDate, nextStopName })) {
      setAdded(true);
      trackEvent({ name: "reminder_downloaded" });
    }
  }

  return (
    <section className={styles.card} aria-labelledby="reminder-title">
      <PackArt name="time-flies" className={styles.art} size={104} />
      <div>
        <h2 id="reminder-title">Make it a daily habit</h2>
        <p>
          Kelus can’t send notifications while it’s closed, so this adds a daily study block, with an alert, to your own calendar. It repeats until your exam.
        </p>
      </div>
      <div className={styles.controls}>
        <label>
          <span>Remind me at</span>
          <select value={time} onChange={(event) => { setTime(event.target.value); setAdded(false); }}>
            {REMINDER_TIMES.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </label>
        <button type="button" onClick={add}>{added ? "Add again" : "Add to my calendar"}</button>
      </div>
      {added ? <p className={styles.done} role="status">Downloaded. Open the file to add it to your calendar. Adding it again replaces it, never doubles it.</p> : null}
    </section>
  );
}
