import type { StudySession } from "./types";

export type ReadinessForecast =
  | { state: "no-evidence" }
  | { state: "flat"; sessionsCounted: number }
  | {
      state: "projected";
      sessionsCounted: number;
      gainPerSession: number;
      projected: number;
      sessionsToTarget: number | null;
      sessionsAvailable: number;
    };

const RECENT_SESSIONS = 3;
const MAX_SESSIONS_AHEAD = 30;

/**
 * Projects readiness at the exam from the learner's own completed sessions.
 * Assumes one session a day until the exam. With no completed session it returns
 * "no-evidence" instead of inventing a number.
 */
export function forecastReadiness(input: {
  sessions: StudySession[];
  readiness: number;
  targetPercent: number;
  daysToExam: number;
}): ReadinessForecast {
  const gains = input.sessions
    .filter((session) => session.status === "complete" && session.summary)
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))
    .slice(0, RECENT_SESSIONS)
    .map((session) => session.summary!.readinessAfter - session.summary!.readinessBefore)
    .filter(Number.isFinite);

  if (!gains.length) return { state: "no-evidence" };

  const gainPerSession = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
  if (gainPerSession <= 0) return { state: "flat", sessionsCounted: gains.length };

  const sessionsAvailable = Math.max(0, Math.min(MAX_SESSIONS_AHEAD, Math.floor(input.daysToExam)));
  const projected = Math.min(1, input.readiness + gainPerSession * sessionsAvailable);
  const gap = input.targetPercent / 100 - input.readiness;
  const sessionsToTarget = gap <= 0 ? 0 : Math.ceil(gap / gainPerSession);

  return {
    state: "projected",
    sessionsCounted: gains.length,
    gainPerSession,
    projected,
    sessionsToTarget: sessionsToTarget > MAX_SESSIONS_AHEAD * 4 ? null : sessionsToTarget,
    sessionsAvailable,
  };
}
