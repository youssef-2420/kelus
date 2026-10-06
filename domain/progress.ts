import type { Concept, LearningEvent, RetrievalOutcome } from "./types";

/**
 * What changed, from the learner's own answers. It is built to be honest: with too few answers it says
 * so instead of drawing a trend, and every number is an estimate, never a predicted grade.
 */

export const MIN_ANSWERS = 6;
export const MIN_TOPICS = 2;
const DAY_MS = 86_400_000;
const STRONG = 0.67;
const WEAK = 0.4;
const MOVED = 0.05;

export type TopicChange = {
  id: string;
  name: string;
  before: number;
  after: number;
  delta: number;
  attempts: number;
  lastOutcome: RetrievalOutcome | null;
};

export type ProgressSummary = {
  answers: number;
  daysStudied: number;
  topicsPractised: number;
  /** Enough answers, across enough topics, to say anything about a trend. */
  enough: boolean;
  answersNeeded: number;
  readinessNow: number;
  readinessThen: number | null;
  points: number | null;
  series: Array<{ label: string; readiness: number; answered: number }>;
  stronger: TopicChange[];
  needsPass: TopicChange[];
  notStarted: TopicChange[];
  topicsLeft: number;
  perDay: number;
  daysToExam: number;
};

const mastering = (event: LearningEvent) => event.kind === "retrieval" || event.kind === "self_rating" || event.kind === "seed_rating";

/** Mastery of one topic at a moment: after its last event by then, else where it started. */
export function masteryAt(concept: Concept, events: LearningEvent[], atMs: number) {
  const mine = events.filter((event) => event.conceptId === concept.id && mastering(event)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!mine.length) return concept.mastery;
  let value: number | null = null;
  for (const event of mine) {
    if (new Date(event.createdAt).getTime() <= atMs) value = event.masteryAfter;
    else break;
  }
  return value ?? mine[0].masteryBefore;
}

function readinessAt(concepts: Concept[], events: LearningEvent[], atMs: number) {
  const total = concepts.reduce((sum, concept) => sum + concept.examImportance, 0);
  if (total <= 0) return 0;
  return concepts.reduce((sum, concept) => sum + masteryAt(concept, events, atMs) * concept.examImportance, 0) / total;
}

const dayKey = (ms: number) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function progressSummary(input: { concepts: Concept[]; events: LearningEvent[]; nowMs: number; daysToExam: number }): ProgressSummary {
  const { concepts, events, nowMs } = input;
  const answered = events.filter((event) => event.kind === "retrieval");
  const week = nowMs - 7 * DAY_MS;
  const fortnight = nowMs - 14 * DAY_MS;

  const recent = answered.filter((event) => new Date(event.createdAt).getTime() >= fortnight);
  const inWeek = answered.filter((event) => new Date(event.createdAt).getTime() >= week);
  const topicsPractised = new Set(recent.map((event) => event.conceptId)).size;
  const enough = recent.length >= MIN_ANSWERS && topicsPractised >= MIN_TOPICS;

  const readinessNow = readinessAt(concepts, events, nowMs);
  const hasHistory = answered.some((event) => new Date(event.createdAt).getTime() <= week) || recent.length > 0;
  const readinessThen = hasHistory ? readinessAt(concepts, events, week) : null;

  const series = Array.from({ length: 14 }, (_, index) => {
    const end = nowMs - (13 - index) * DAY_MS;
    const key = dayKey(end);
    const date = new Date(end);
    return {
      label: date.toLocaleDateString([], { weekday: "short", day: "numeric" }),
      readiness: readinessAt(concepts, events, end),
      answered: answered.filter((event) => dayKey(new Date(event.createdAt).getTime()) === key).length,
    };
  });

  const topics: TopicChange[] = concepts.map((concept) => {
    const mine = answered.filter((event) => event.conceptId === concept.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const before = masteryAt(concept, events, week);
    const after = masteryAt(concept, events, nowMs);
    return { id: concept.id, name: concept.name, before, after, delta: after - before, attempts: mine.length, lastOutcome: mine.at(-1)?.outcome ?? null };
  });

  const stronger = topics.filter((topic) => topic.delta >= MOVED).sort((a, b) => b.delta - a.delta);
  const climbing = new Set(stronger.map((topic) => topic.id));
  // A topic is in one list. One that went up is "stronger", unless the answer you gave last still missed.
  const needsPass = topics
    .filter((topic) => topic.attempts > 0 && (topic.after < WEAK || topic.delta <= -MOVED || topic.lastOutcome === "failure"))
    .filter((topic) => !climbing.has(topic.id) || topic.lastOutcome === "failure")
    .sort((a, b) => a.after - b.after);
  const notStarted = topics.filter((topic) => topic.attempts === 0);
  const topicsLeft = topics.filter((topic) => topic.after < STRONG).length;

  return {
    answers: inWeek.length,
    daysStudied: new Set(inWeek.map((event) => dayKey(new Date(event.createdAt).getTime()))).size,
    topicsPractised: new Set(inWeek.map((event) => event.conceptId)).size,
    enough,
    answersNeeded: Math.max(0, MIN_ANSWERS - recent.length),
    readinessNow,
    readinessThen,
    points: readinessThen === null ? null : Math.round((readinessNow - readinessThen) * 100),
    series,
    stronger,
    needsPass,
    notStarted,
    topicsLeft,
    perDay: Math.ceil(topicsLeft / Math.max(1, input.daysToExam)),
    daysToExam: input.daysToExam,
  };
}

/** One honest sentence about the week. */
export function progressHeadline(summary: ProgressSummary) {
  if (!summary.enough) {
    const more = summary.answersNeeded > 0 ? ` Answer ${summary.answersNeeded} more topic check${summary.answersNeeded === 1 ? "" : "s"}` : " Practise one more topic";
    return `Too early to say.${more} and Kelus can show a real trend.`;
  }
  const points = summary.points ?? 0;
  if (points >= 2) return `Up ${points} points this week. ${summary.stronger.length} topic${summary.stronger.length === 1 ? "" : "s"} got stronger.`;
  if (points <= -2) return `Down ${Math.abs(points)} points. ${summary.needsPass.length ? `${summary.needsPass[0].name} needs another pass.` : "Some topics slipped without review."}`;
  return "About the same as last week. A few more answers on weaker topics will move it.";
}
