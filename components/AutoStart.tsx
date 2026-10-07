"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReadingNotes } from "@/components/ReadingNotes";
import styles from "./AutoStart.module.css";

const FLAG = "kelus-start-first-run";

function flagged() {
  try { return window.sessionStorage.getItem(FLAG) === "1"; } catch { return false; }
}

/**
 * Right after the first notes are read, open the first question instead of parking on a plan screen. Once.
 * While it opens, the reading screen stays on top, so Today never flashes up for a moment in between.
 */
export function AutoStart({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  const fired = useRef(false);
  // Mounted only after the notes are read (never in the server HTML), so reading storage here is safe.
  const [covering] = useState(() => typeof window !== "undefined" && flagged());
  useEffect(() => {
    if (fired.current || !ready) return;
    if (!flagged()) return;
    fired.current = true;
    try { window.sessionStorage.removeItem(FLAG); } catch { /* Harmless. */ }
    onStart();
    // Once, when Today is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  if (!covering) return null;
  // At the page body, so no animated parent can shift it or let the tab bar show through.
  return createPortal(
    <div className={styles.cover}>
      <ReadingNotes message="Your first question is ready." />
    </div>,
    document.body,
  );
}
