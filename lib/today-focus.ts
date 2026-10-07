import { resumeSessionIndex } from "@/domain/session-engine";
import type { LearningEvent, StudySession } from "@/domain/types";

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
