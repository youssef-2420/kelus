"use client";

import { useSyncExternalStore } from "react";
import { getDemoSnapshot, markExamPassPurchased, subscribeDemoState } from "./demo-store";

const listeners = new Set<() => void>();
let cachedActive = false;
let cachedConfigured = false;
let hydrated = false;
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function syncedPassActive() {
  if (typeof window === "undefined") return false;
  return Boolean(getDemoSnapshot().examPassAt);
}

export function subscribeExamPass(listener: () => void) {
  listeners.add(listener);
  const unsubDemo = subscribeDemoState(() => {
    emit();
  });
  return () => {
    listeners.delete(listener);
    unsubDemo();
  };
}

export function hasExamPass() {
  return cachedActive || syncedPassActive();
}

export function examPassApiConfigured() {
  return cachedConfigured;
}

export function getExamPassSnapshot() {
  return { active: hasExamPass(), configured: cachedConfigured, hydrated, cookieActive: cachedActive };
}

/** Detects checkout return URLs. Bare ?pass=1 must not unlock by itself. */
export function isExamPassReturnQuery(search: { get(name: string): string | null }) {
  return (
    search.get("pass") === "1" ||
    search.get("exam_pass") === "success" ||
    Boolean(search.get("session_id")?.startsWith("cs_"))
  );
}

export async function refreshExamPassStatus() {
  if (typeof window === "undefined") return getExamPassSnapshot();
  if (inflight) {
    await inflight;
    return getExamPassSnapshot();
  }
  inflight = (async () => {
    try {
      const res = await fetch("/api/exam-pass/status", {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        cachedActive = false;
        cachedConfigured = false;
      } else {
        const data = (await res.json()) as { active?: boolean; configured?: boolean; at?: string | null };
        cachedActive = Boolean(data.active);
        cachedConfigured = data.configured !== false;
        if (cachedActive && data.at) markExamPassPurchased(data.at);
      }
    } catch {
      cachedActive = false;
      cachedConfigured = false;
    } finally {
      hydrated = true;
      inflight = null;
      emit();
    }
  })();
  await inflight;
  return getExamPassSnapshot();
}

export async function redeemExamPass(input: { sessionId?: string; code?: string; email?: string }) {
  const res = await fetch("/api/exam-pass/redeem", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sessionId: input.sessionId?.trim() || undefined,
      code: input.code?.trim() || undefined,
      email: input.email?.trim() || undefined,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; at?: string; method?: string };
  if (!res.ok || !data.ok) {
    return { ok: false as const, error: data.error || "Could not unlock Exam Pass." };
  }
  cachedActive = true;
  cachedConfigured = true;
  hydrated = true;
  markExamPassPurchased(data.at || new Date().toISOString());
  emit();
  return { ok: true as const, at: data.at, method: data.method };
}

/** Cookie is browser-scoped; refresh status after account switch. */
export function claimGuestExamPass(_userId: string) {
  void refreshExamPassStatus();
}

export function useExamPass() {
  const active = useSyncExternalStore(subscribeExamPass, hasExamPass, () => false);
  return active;
}

if (typeof window !== "undefined") {
  void refreshExamPassStatus();
}
