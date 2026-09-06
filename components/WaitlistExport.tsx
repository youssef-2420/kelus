"use client";

import { useState } from "react";
import { downloadWaitlistCsv, readWaitlistEntries, waitlistEndpointConfigured } from "@/lib/waitlist";

export function WaitlistExport() {
  const [count, setCount] = useState(() => (typeof window === "undefined" ? 0 : readWaitlistEntries().length));
  const [message, setMessage] = useState("");
  const remoteReady = waitlistEndpointConfigured();

  function exportEntries() {
    const exported = downloadWaitlistCsv();
    setCount(readWaitlistEntries().length);
    setMessage(
      exported
        ? `Downloaded ${exported} local signup${exported === 1 ? "" : "s"}.`
        : "No local signups on this device yet.",
    );
  }

  if (remoteReady && count === 0) return null;

  return (
    <aside className="waitlist-export" aria-label="Local waitlist recovery">
      <p>
        {remoteReady
          ? "This browser may also hold earlier on-device signups from before remote delivery was configured."
          : "Remote waitlist delivery isn’t configured in this build. Signups stay on this device until it is."}
      </p>
      <button type="button" className="text-btn" onClick={exportEntries}>
        Download local signups ({count})
      </button>
      <p className="waitlist-export-message" role="status" aria-live="polite">
        {message || " "}
      </p>
    </aside>
  );
}
