"use client";

import { useState } from "react";
import { downloadQuestionsCsv, readQuestionEntries } from "@/lib/questions";

export function QuestionsExport() {
  const [count, setCount] = useState(() => (typeof window === "undefined" ? 0 : readQuestionEntries().length));
  const [message, setMessage] = useState("");

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
