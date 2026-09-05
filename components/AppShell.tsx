"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useLearner } from "@/components/LearnerProvider";

export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const path = usePathname();
  const { state, reset } = useLearner();
  const [open, setOpen] = useState(false);
  const today = path.startsWith("/today") || path.startsWith("/session");
  const map = path.startsWith("/map");
  const initial = state.snapshot.profile.displayName.trim().charAt(0).toUpperCase() || "K";

  return (
    <div className="shell">
      <header className="app-bar">
        <Link href="/" className="mark">
          Kelus
        </Link>
        <nav className="app-nav" aria-label="Primary">
          <Link href="/today" className={today ? "is-active" : undefined} aria-current={today ? "page" : undefined}>
            Today
          </Link>
          <Link href="/map" className={map ? "is-active" : undefined} aria-current={map ? "page" : undefined}>
            Map
          </Link>
        </nav>
        <div className="app-account">
          {action}
          <button
            type="button"
            className="app-avatar"
            aria-expanded={open}
            aria-controls="app-account-menu"
            aria-label="Account"
            onClick={() => setOpen((current) => !current)}
          >
            {initial}
          </button>
          <div id="app-account-menu" className="app-account-menu" hidden={!open}>
            <Link href="/materials" onClick={() => setOpen(false)}>
              Materials
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
