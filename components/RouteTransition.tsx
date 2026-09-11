"use client";

import type { ReactNode } from "react";

/**
 * Layout shell for page content. Route motion lives in React `<ViewTransition>`
 * on each page (`PageTransition`) — do not wrap layout `{children}` in a VT
 * or page enter/exit will be skipped.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  return <div className="route-transition">{children}</div>;
}
