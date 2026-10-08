import type { Concept, LearningEvent } from "./types";

export type HabitDay = { key: string; label: string; studied: boolean; today: boolean };

export type HabitSummary = {
  /** Consecutive days with at least one answered topic. Stays alive until the end of the day after the last one. */
  streak: number;
  studiedToday: boolean;
  topicsToday: number;
  goal: number;
  goalMet: boolean;
  week: HabitDay[];
  /** Readiness points earned from answers in the last 7 days; 0 when nothing improved. */
  pointsThisWeek: number;
  /** Topics whose next review falls tomorrow. */
  backTomorrow: number;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
export const DAILY_TOPIC_GOAL = 3;

export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgo(now: Date, count: number) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - count, 12);
  return date;
}

/** What the learner did, in their own calendar days. Only answered topics count, never just opening the app. */
export function habitSummary(input: { events: LearningEvent[]; concepts: Concept[]; nowMs?: number }): HabitSummary {
  const now = new Date(input.nowMs ?? Date.now());
  const answered = input.events.filter((event) => event.kind === "retrieval");
  const topicsByDay = new Map<string, Set<string>>();
  for (const event of answered) {
    const key = dayKey(new Date(event.createdAt));
    if (!topicsByDay.has(key)) topicsByDay.set(key, new Set());
    topicsByDay.get(key)!.add(event.conceptId);
  }

  const todayKey = dayKey(now);
  const studiedToday = topicsByDay.has(todayKey);
  let streak = 0;
  for (let back = studiedToday ? 0 : 1; ; back += 1) {
    if (!topicsByDay.has(dayKey(daysAgo(now, back)))) break;
    streak += 1;
    if (streak > 3650) break;
  }

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = daysAgo(now, 6 - index);
    const key = dayKey(date);
    return { key, label: DAY_LABELS[date.getDay()], studied: topicsByDay.has(key), today: key === todayKey };
  });

  const goal = Math.max(1, Math.min(DAILY_TOPIC_GOAL, input.concepts.length));
  const topicsToday = topicsByDay.get(todayKey)?.size ?? 0;

  const weights = new Map(input.concepts.map((concept) => [concept.id, concept.examImportance]));
  const totalWeight = input.concepts.reduce((sum, concept) => sum + concept.examImportance, 0);
  const since = new Date(daysAgo(now, 6).getFullYear(), daysAgo(now, 6).getMonth(), daysAgo(now, 6).getDate()).getTime();
  const gained = totalWeight > 0
    ? answered
        .filter((event) => new Date(event.createdAt).getTime() >= since)
        .reduce((sum, event) => sum + (event.masteryAfter - event.masteryBefore) * (weights.get(event.conceptId) ?? 0), 0) / totalWeight
    : 0;

  const tomorrowKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12));
  const backTomorrow = input.concepts.filter((concept) => concept.nextReviewAt && dayKey(new Date(concept.nextReviewAt)) === tomorrowKey).length;

  return {
    streak,
    studiedToday,
    topicsToday,
    goal,
    goalMet: topicsToday >= goal,
    week,
    pointsThisWeek: Math.max(0, Math.round(gained * 100)),
    backTomorrow,
  };
}

export type StudyPath = { total: number; started: number; solid: number; daysLeft: number; readyByMs: number | null; aheadOfExam: number | null };

/**
 * How far the course is, in plain steps: topics started, topics solid, and about how many study days remain at the
 * daily goal. With a real exam date, when that would finish and how it compares with the exam.
 */
export function studyPath(input: { concepts: Concept[]; nowMs: number; daysToExam: number | null; goal?: number }): StudyPath {
  const goal = input.goal ?? DAILY_TOPIC_GOAL;
  const total = input.concepts.length;
  const started = input.concepts.filter((concept) => concept.retrievalAttempts > 0).length;
  const solid = input.concepts.filter((concept) => concept.retrievalAttempts > 0 && concept.mastery >= 0.67).length;
  // A topic needs about two good passes to become solid; unstarted ones need both, started ones one more.
  const passes = input.concepts.reduce((sum, concept) => sum + (concept.retrievalAttempts > 0 && concept.mastery >= 0.67 ? 0 : concept.retrievalAttempts > 0 ? 1 : 2), 0);
  const daysLeft = passes === 0 ? 0 : Math.max(1, Math.ceil(passes / goal));
  const readyByMs = input.daysToExam === null ? null : input.nowMs + (daysLeft - 1) * 86_400_000;
  return { total, started, solid, daysLeft, readyByMs, aheadOfExam: input.daysToExam === null ? null : input.daysToExam - daysLeft };
}
