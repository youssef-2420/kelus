import { resumeSessionIndex } from "@/domain/session-engine";
import type { Concept, LearningEvent, StudySession } from "@/domain/types";

/** A block left open for half a day is yesterday's plan; Today starts fresh instead of resuming it. */
export const STALE_SESSION_MS = 12 * 60 * 60 * 1000;

export function freshOpenSession(sessions: StudySession[], courseId: string, nowIso: string) {
  const open = sessions.find((session) => session.courseId === courseId && session.status === "in_progress");
  return open && Date.parse(nowIso) - Date.parse(open.startedAt) < STALE_SESSION_MS ? open : undefined;
}

/** The topic "Continue" opens: every screen that names the next topic names this one. */
export function resumeConceptId(session: StudySession | undefined, events: LearningEvent[]) {
  return session ? session.plannedConceptIds[resumeSessionIndex(session, events)] : undefined;
}

const REST_MS = 4 * 60 * 60 * 1000;

/** Topics answered in the last few hours: they rest, the same spacing the warm-up uses for missed lines. */
export function restingTopics(events: LearningEvent[], nowIso: string) {
  const now = Date.parse(nowIso);
  return new Set(events.filter((event) => event.kind === "retrieval" && now - Date.parse(event.createdAt) < REST_MS).map((event) => event.conceptId));
}

/**
 * The route with resting topics moved behind the others, order otherwise kept. Straight after a block, "Up next"
 * should be a topic you have not just answered; if everything is resting, the route is unchanged.
 */
export function restAware<T extends { conceptId: string; minutes: number }>(allocations: T[], events: LearningEvent[], nowIso: string, concepts: Concept[] = []): T[] {
  const resting = restingTopics(events, nowIso);
  const fresh = allocations.filter((item) => !resting.has(item.conceptId));
  if (fresh.some((item) => item.conceptId !== "mixed-retrieval")) return [...fresh, ...allocations.filter((item) => resting.has(item.conceptId))];
  // Everything planned was just answered: an untouched topic (most exam weight first) leads instead.
  const planned = new Set(allocations.map((item) => item.conceptId));
  const untouched = concepts
    .filter((concept) => concept.retrievalAttempts === 0 && !planned.has(concept.id) && !resting.has(concept.id))
    .sort((a, b) => b.examImportance - a.examImportance);
  if (!untouched.length) return allocations;
  const minutes = allocations.find((item) => item.conceptId !== "mixed-retrieval")?.minutes ?? 8;
  const lead = { conceptId: untouched[0].id, minutes, learningValue: 0, reasons: [] } as unknown as T;
  return [lead, ...allocations];
}
