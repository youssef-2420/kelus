"use client";

import { useEffect, useRef } from "react";

/** Right after the first notes are read, open the first question instead of parking on a plan screen. Once. */
export function AutoStart({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !ready) return;
    let flagged = false;
    try { flagged = window.sessionStorage.getItem("kelus-start-first-run") === "1"; } catch { /* No flag: stay on Today. */ }
    if (!flagged) return;
    fired.current = true;
    try { window.sessionStorage.removeItem("kelus-start-first-run"); } catch { /* Harmless. */ }
    onStart();
    // Once, when Today is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return null;
}
