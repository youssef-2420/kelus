import { getDemoStateOwner } from "./demo-store";

const PREFIX = "kelus:exam-pass:v1";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function examPassStorageKey(ownerId: string | null = getDemoStateOwner()) {
  return `${PREFIX}:${ownerId ?? "guest"}`;
}

export function isExamPassReturnQuery(search: { get(name: string): string | null }) {
  return search.get("pass") === "1" || search.get("exam_pass") === "success";
}

export function subscribeExamPass(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasExamPass(ownerId: string | null = getDemoStateOwner()) {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(examPassStorageKey(ownerId)));
  } catch {
    return false;
  }
}

export function activateExamPass(ownerId: string | null = getDemoStateOwner(), atIso = new Date().toISOString()) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(examPassStorageKey(ownerId), atIso);
    emit();
    return true;
  } catch {
    return false;
  }
}

export function claimGuestExamPass(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const guest = window.localStorage.getItem(examPassStorageKey(null));
    if (!guest) return;
    if (!window.localStorage.getItem(examPassStorageKey(userId))) {
      window.localStorage.setItem(examPassStorageKey(userId), guest);
    }
    window.localStorage.removeItem(examPassStorageKey(null));
    emit();
  } catch {
    /* Exam Pass is optional local state. */
  }
}
