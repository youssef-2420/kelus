"use client";

import type { ReactNode } from "react";

export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="shell">
      {action ? <div className="shell-context-action">{action}</div> : null}
      <main id="main">{children}</main>
    </div>
  );
}
