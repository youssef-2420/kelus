"use client";

import { useEffect, useState } from "react";
import { downloadQuestionsCsv, readQuestionEntries } from "@/lib/questions";

export const QUESTIONS_UPDATED_EVENT = "kelus:questions-updated";

export function QuestionsExport() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => setCount(readQuestionEntries().length);
    refresh();
    window.addEventListener(QUESTIONS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(QUESTIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function exportEntries() {
    const exported = downloadQuestionsCsv();
    setCount(readQuestionEntries().length);
    setMessage(
      exported
        ? `Downloaded ${exported} local question${exported === 1 ? "" : "s"} (backup copy).`
        : "No local questions on this device yet.",
    );
  }

  if (count === 0) return null;

  return (
    <aside className="waitlist-export" aria-label="Local questions backup">
      <p>This browser also keeps a backup of questions sent from here, in case inbox delivery hiccups.</p>
      <button type="button" className="text-btn" onClick={exportEntries}>
        Download local questions ({count})
      </button>
      <p className="waitlist-export-message" role="status" aria-live="polite">
        {message || " "}
      </p>
    </aside>
  );
}
