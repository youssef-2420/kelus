"use client";

import { useState } from "react";
import { downloadQuestionsCsv, questionsEndpointConfigured, readQuestionEntries } from "@/lib/questions";

export function QuestionsExport() {
  const [count, setCount] = useState(() => (typeof window === "undefined" ? 0 : readQuestionEntries().length));
  const [message, setMessage] = useState("");
  const remoteReady = questionsEndpointConfigured();

  function exportEntries() {
    const exported = downloadQuestionsCsv();
    setCount(readQuestionEntries().length);
    setMessage(
      exported
        ? `Downloaded ${exported} local question${exported === 1 ? "" : "s"}.`
        : "No local questions on this device yet.",
    );
  }

  if (remoteReady && count === 0) return null;

  return (
    <aside className="waitlist-export" aria-label="Local questions recovery">
      <p>
        {remoteReady
          ? "This browser may also hold earlier on-device questions from before remote delivery was configured."
          : "Remote question delivery isn’t configured in this build. Questions stay on this device until it is."}
      </p>
      <button type="button" className="text-btn" onClick={exportEntries}>
        Download local questions ({count})
      </button>
      <p className="waitlist-export-message" role="status" aria-live="polite">
        {message || " "}
      </p>
    </aside>
  );
}
