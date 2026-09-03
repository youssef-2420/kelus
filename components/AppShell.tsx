import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/today" className="mark">Kelus</Link>
        <nav className="nav" aria-label="Primary">
          <Link href="/today">Today</Link>
          <Link href="/map">Knowledge map</Link>
        </nav>
        {action}
      </header>
      {children}
    </div>
  );
}
