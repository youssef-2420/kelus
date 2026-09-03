import { clamp01 } from "@/domain/learner-model";
import type { ConceptStatus } from "@/domain/types";

export function percent(value: number) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

export function statusLabel(status: ConceptStatus) {
  if (status === "not_learned") return "Not learned";
  if (status === "weak") return "Weak";
  if (status === "fading") return "Fading";
  if (status === "strong") return "Strong";
  return "Stable";
}

export function formatDay(iso: string) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function daysAgoLabel(iso: string | null, nowIso: string) {
  if (!iso) return "Not reviewed";
  const days = Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(iso)) / 86_400_000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function greeting(nowIso: string) {
  const hour = new Date(nowIso).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
