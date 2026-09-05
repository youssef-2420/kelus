"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const path = usePathname();
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="mark">Kelus</Link>
        <nav className="nav" aria-label="Primary">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>Home</Link>
          <Link href="/today" className={path.startsWith("/today") || path.startsWith("/session") ? "is-active" : undefined} aria-current={path.startsWith("/today") || path.startsWith("/session") ? "page" : undefined}>Today</Link>
          <Link href="/materials" className={path.startsWith("/materials") ? "is-active" : undefined} aria-current={path.startsWith("/materials") ? "page" : undefined}>Materials</Link>
        </nav>
        {action}
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
