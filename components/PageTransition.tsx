"use client";

/// <reference types="react/canary" />

import type { ReactNode } from "react";
import { ViewTransition } from "react";

/**
 * Hierarchical routes (Map ↔ concept detail). Only animates when
 * `transitionTypes` includes nav-forward / nav-back.
 */
export function DirectionalPage({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/**
 * Lateral / unordered routes (header tabs, home ↔ product). Cross-fade only —
 * no directional depth.
 */
export function LateralPage({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="fade-in" exit="fade-out" default="none">
      {children}
    </ViewTransition>
  );
}

/** Suspense fallback → content handoff. */
export function SuspenseReveal({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="slide-up" default="none">
      {children}
    </ViewTransition>
  );
}

export function SuspenseFallbackExit({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="slide-down" default="none">
      {children}
    </ViewTransition>
  );
}

/** Shared concept title across Map / inspector / detail. */
export function ConceptTitleTransition({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={`concept-title-${id}`} share="text-morph" default="none">
      {children}
    </ViewTransition>
  );
}
