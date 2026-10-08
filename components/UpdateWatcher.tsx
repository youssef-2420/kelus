"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const EVERY_MS = 30 * 60 * 1000;

/**
 * A tab left open for days keeps running the Kelus it loaded. When the learner comes back to it (or every half hour),
 * this checks whether a newer Kelus is live and reloads into it, but never in the middle of a question: in a session
 * it waits until they leave it.
 */
export function UpdateWatcher() {
  const pathname = usePathname();
  const pending = useRef(false);
  const inSession = pathname.startsWith("/session");

  useEffect(() => {
    if (BUILD === "dev" || process.env.NODE_ENV !== "production") return;
    const check = async () => {
      if (document.hidden) return;
      try {
        const live = await (await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })).json();
        if (live?.id && live.id !== BUILD) {
          pending.current = true;
          if (!window.location.pathname.startsWith("/session")) window.location.reload();
        }
      } catch { /* Offline or blocked: try again next time. */ }
    };
    void check();
    const timer = window.setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);

  // A newer version found during a session is loaded as soon as the learner leaves it.
  useEffect(() => {
    if (pending.current && !inSession) window.location.reload();
  }, [inSession]);

  return null;
}
