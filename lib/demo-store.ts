import { createDemoSnapshot } from "../data/demo-seed";
import { ALGORITHM_KIND, SELF_RATING_MASTERY } from "../domain/constants";
import { advanceDemoClock, isDemoClockEnabled } from "../domain/demo-clock";
import { recomputeConceptCache, withCachedState } from "../domain/learner-model";
import { generateRoute } from "../domain/routing-engine";
import { estimatedReadiness } from "../domain/readiness";
import { recalculateSessionRoute } from "../domain/session-engine";
import { buildConfirmedMaterialModel, isNamedTopic, looksReadable, topicNameFrom } from "../domain/material-intelligence";
import { createRetrievalEvent, sessionSummary } from "../domain/session";
import type { Concept, ExtractedMaterialPage, LearnerSnapshot, LearningEvent, ProposedConcept, RetrievalOutcome, SelfRating, StudySession } from "../domain/types";
import { createLearnerSnapshot, type SetupInput } from "./setup";
import type { MissedLine } from "../domain/return-visit";
import { restAware } from "./today-focus";

const STORAGE_KEY = "kelus-learning-state-v2";
const LAST_SESSION_KEY = "kelus:last-session-completed-at";
const GUEST_OWNER = "guest";
/** Advance frozen learner clocks once wall time has moved (return visits). */
const CLOCK_STALE_MS = 60_000;
const SERVER_NOW_MS = Date.parse("2026-09-05T12:00:00.000Z");

export type DemoState = {
  snapshot: LearnerSnapshot;
  nowIso: string;
  onboardingCompleted: boolean;
  diagnosisCompleted: boolean;
  /** Lines missed in runs, for the next visit's warm-up. Part of the state, so it syncs with the account. */
  missedLines?: MissedLine[];
};

const MISSED_LIMIT = 40;

/** Both lists, one entry per line, newest last: used when two devices meet at sign-in. */
export function mergeMissedLines(a: MissedLine[] = [], b: MissedLine[] = []) {
  const byQuote = new Map<string, MissedLine>();
  for (const line of [...a, ...b]) {
    const seen = byQuote.get(line.quote);
    if (!seen || line.at > seen.at) byQuote.set(line.quote, line);
  }
  return [...byQuote.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-MISSED_LIMIT);
}

/** Changes the missed-line list and saves it with the rest of the learner state. */
export function updateMissedLines(change: (lines: MissedLine[]) => MissedLine[]) {
  const state = getDemoSnapshot();
  const current = state.missedLines ?? [];
  const next = change(current).slice(-MISSED_LIMIT);
  if (next.length === current.length && next.every((line, index) => line === current[index])) return;
  persistDemoState({ ...state, missedLines: next }, true);
}

function refreshCaches(snapshot: LearnerSnapshot, nowIso: string): LearnerSnapshot {
  return {
    ...snapshot,
    learningActivities: snapshot.learningActivities ?? [],
    concepts: snapshot.concepts.map((concept) => withCachedState(concept, recomputeConceptCache(concept, snapshot.events, nowIso))),
  };
}

export function advanceNowIfNeeded(state: DemoState, nowMs = Date.now()): { state: DemoState; changed: boolean } {
  const stored = Date.parse(state.nowIso);
  const clockMoved = Number.isFinite(stored) && nowMs - stored >= CLOCK_STALE_MS;
  const nowIso = clockMoved ? new Date(nowMs).toISOString() : state.nowIso;
  // Only the bundled sample is a rolling exam. Never move a student's own date.
  const demoExpired = state.snapshot.exams.some((exam) =>
    exam.id === "exam-microeconomics-final" && exam.courseId === "course-microeconomics"
    && Date.parse(exam.examDate) <= nowMs,
  );
  const snapshot = demoExpired ? {
    ...state.snapshot,
    exams: state.snapshot.exams.map((exam) =>
      exam.id === "exam-microeconomics-final" && exam.courseId === "course-microeconomics"
        ? { ...exam, examDate: new Date(nowMs + 9 * 86_400_000).toISOString() }
        : exam,
    ),
  } : state.snapshot;
  return { state: { ...state, nowIso, snapshot: refreshCaches(snapshot, nowIso) }, changed: clockMoved || demoExpired };
}

export function markSessionCompleted(atIso = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastSessionKey(), atIso);
  } catch {
    /* Optional retention signal. */
  }
}

export function lastSessionCompletedAt() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(lastSessionKey());
  } catch {
    return null;
  }
}

export function initialDemoState(nowMs = Date.now()): DemoState {
  const snapshot = createDemoSnapshot(nowMs);
  const nowIso = new Date(nowMs).toISOString();
  return { snapshot: refreshCaches(snapshot, nowIso), nowIso, onboardingCompleted: false, diagnosisCompleted: false };
}

const SERVER_SNAPSHOT = initialDemoState(SERVER_NOW_MS);

function lastSessionKey(ownerId = activeOwnerId) {
  return `${LAST_SESSION_KEY}:${ownerId ?? GUEST_OWNER}`;
}

export function validStoredState(value: unknown): value is DemoState {
  const state = value as DemoState;
  return Boolean(
    Array.isArray(state?.snapshot?.concepts)
    && Array.isArray(state.snapshot.courses)
    && Array.isArray(state.snapshot.exams)
    && state.snapshot.exams?.[0]?.targetPercent
    && state.snapshot.concepts.every((concept) => typeof concept.examImportance === "number"),
  );
}

export function stateForAuthenticatedUser(state: DemoState, userId: string): DemoState {
  return {
    ...state,
    snapshot: {
      ...state.snapshot,
      profile: { ...state.snapshot.profile, id: userId },
      courses: state.snapshot.courses.map((course) => ({ ...course, userId })),
      exams: state.snapshot.exams.map((exam) => ({ ...exam, userId })),
      concepts: state.snapshot.concepts.map((concept) => ({ ...concept, userId })),
      events: state.snapshot.events.map((event) => ({ ...event, userId })),
      sessions: state.snapshot.sessions.map((session) => ({ ...session, userId })),
    },
  };
}

/** Keep an existing account's route; claim a guest route only for a new account. */
export function chooseLocalStateForSignIn(account: DemoState | null, guest: DemoState | null, fallback: DemoState) {
  if (account) return { state: account, claimGuest: false };
  if (guest?.onboardingCompleted) return { state: guest, claimGuest: true };
  return { state: fallback, claimGuest: false };
}

export function replaceDemoState(value: unknown) {
  if (!validStoredState(value)) throw new Error("The saved learner state is not compatible with this version of Kelus.");
  const { state } = advanceNowIfNeeded(value);
  persistDemoState(state, true);
  return state;
}

let activeOwnerId: string | null = null;

export function demoStateStorageKey(ownerId: string | null = activeOwnerId) {
  return `${STORAGE_KEY}:${ownerId ?? GUEST_OWNER}`;
}

export function readStoredDemoState(ownerId = activeOwnerId): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(demoStateStorageKey(ownerId)) ?? "null");
    if (!validStoredState(parsed)) return null;
    const advanced = advanceNowIfNeeded(parsed);
    const purged = purgeUnsourcedTopics(advanced.state);
    const named = nameNumberedTopics(purged.state);
    if (advanced.changed || purged.changed || named.changed) window.localStorage.setItem(demoStateStorageKey(ownerId), JSON.stringify(named.state));
    return named.state;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
let clientCache: DemoState | null = null;
const emit = () => listeners.forEach((listener) => listener());

/**
 * Most changes are computed from a copy of the state taken earlier (a run is graded from the state it started
 * with). Missed lines change on their own path, so every other save carries the newest list forward instead of
 * dropping lines added in the meantime. Only the missed-line updater and a full replace set the list itself.
 */
function persistDemoState(input: DemoState, ownsMissedLines = false) {
  const state = ownsMissedLines || !clientCache?.missedLines ? input : { ...input, missedLines: clientCache.missedLines };
  clientCache = state;
  if (typeof window !== "undefined") window.localStorage.setItem(demoStateStorageKey(), JSON.stringify(state));
  emit();
}

export function getDemoStateOwner() {
  return activeOwnerId;
}

export function setDemoStateOwner(userId: string | null) {
  if (activeOwnerId === userId && clientCache) return;
  activeOwnerId = userId;
  clientCache = readStoredDemoState(userId) ?? SERVER_SNAPSHOT;
  emit();
}

export function clearStoredDemoState(ownerId: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(demoStateStorageKey(ownerId));
}

export function subscribeDemoState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoSnapshot() {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (!clientCache) clientCache = readStoredDemoState(activeOwnerId) ?? SERVER_SNAPSHOT;
  return clientCache;
}

export const getServerDemoSnapshot = () => SERVER_SNAPSHOT;

export function resetDemoState(nowMs = Date.now()) {
  const state = initialDemoState(nowMs);
  persistDemoState(state, true); // A fresh start: no lines carried over from before.
  if (typeof window !== "undefined") {
    void import("./material-store").then(({ clearMaterials }) => clearMaterials());
  }
  return state;
}

export function loadAminaDemo(nowMs = Date.now()) {
  const nowIso = new Date(nowMs).toISOString();
  const state: DemoState = {
    snapshot: refreshCaches(createDemoSnapshot(nowMs), nowIso),
    nowIso,
    onboardingCompleted: true,
    diagnosisCompleted: true,
  };
  persistDemoState(state, true); // A fresh start: no lines carried over from before.
  if (typeof window !== "undefined") {
    void import("./material-store").then(({ clearMaterials, seedDemoMaterial }) => {
      clearMaterials();
      seedDemoMaterial(state.snapshot.courses[0]?.id ?? "course-microeconomics", nowIso);
    });
  }
  return state;
}

export function completeOnboarding(input: SetupInput, nowMs = Date.now()) {
  const nowIso = new Date(nowMs).toISOString();
  const state: DemoState = {
    snapshot: createLearnerSnapshot(input, nowMs),
    nowIso,
    onboardingCompleted: true,
    diagnosisCompleted: false,
  };
  // The first PDF is committed to IndexedDB before this state becomes visible.
  // Clearing materials here would race with that write and strand the course.
  persistDemoState(state, true); // A fresh start: no lines carried over from before.
  return state;
}

export function completeDiagnosis(state: DemoState, input: {
  ratings: Record<string, SelfRating>;
  retrievals: Array<{ conceptId: string; promptId: string; responseText: string; outcome: RetrievalOutcome; responseTimeMs: number }>;
}) {
  const userId = state.snapshot.profile.id;
  const ratingEvents: LearningEvent[] = Object.entries(input.ratings).flatMap(([conceptId, rating]) => {
    const concept = state.snapshot.concepts.find((item) => item.id === conceptId);
    if (!concept) return [];
    const mastery = SELF_RATING_MASTERY[rating];
    return [{
      id: `diagnosis-rating-${concept.id}`,
      userId,
      conceptId: concept.id,
      sessionId: null,
      kind: "self_rating",
      outcome: null,
      selfRating: rating,
      assistance: "none",
      responseTimeMs: null,
      promptId: null,
      responseText: null,
      masteryBefore: 0,
      masteryAfter: mastery,
      createdAt: state.nowIso,
    }];
  });
  let snapshot = refreshCaches({ ...state.snapshot, events: ratingEvents }, state.nowIso);
  const retrievalEvents: LearningEvent[] = [];
  for (const retrieval of input.retrievals) {
    const concept = snapshot.concepts.find((item) => item.id === retrieval.conceptId);
    if (!concept) continue;
    const event = createRetrievalEvent({
      id: `diagnosis-retrieval-${retrieval.conceptId}`,
      userId,
      concept,
      sessionId: "diagnosis",
      promptId: retrieval.promptId,
      responseText: retrieval.responseText,
      outcome: retrieval.outcome,
      responseTimeMs: retrieval.responseTimeMs,
      createdAt: state.nowIso,
    });
    retrievalEvents.push(event);
    snapshot = refreshCaches({ ...snapshot, events: [...snapshot.events, event] }, state.nowIso);
  }
  const next = { ...state, snapshot, diagnosisCompleted: true };
  persistDemoState(next);
  return next;
}

export function confirmMaterialConcepts(
  state: DemoState,
  proposals: ProposedConcept[],
  pages?: ExtractedMaterialPage[],
) {
  if (!proposals.length) throw new Error("Keep at least one concept before building the map.");
  const course = state.snapshot.courses[0];
  if (!course) throw new Error("Set a destination before confirming concepts.");
  const model = buildConfirmedMaterialModel({
    proposals,
    courseId: course.id,
    userId: state.snapshot.profile.id,
    nowIso: state.nowIso,
    pages,
  });
  const existingConcepts = state.snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const oldConceptById = new Map(existingConcepts.map((concept) => [concept.id, concept]));
  const oldActivityById = new Map(state.snapshot.learningActivities.map((activity) => [activity.conceptId, activity]));
  const newConceptIds = new Set(model.concepts.map((concept) => concept.id));
  const newPromptIds = new Set(model.prompts.map((prompt) => prompt.conceptId));
  const newActivityIds = new Set(model.learningActivities.map((activity) => activity.conceptId));
  const newRelationshipIds = new Set(model.relationships.map((relationship) => relationship.id));
  const snapshot: LearnerSnapshot = refreshCaches({
    ...state.snapshot,
    concepts: [
      ...state.snapshot.concepts.filter((concept) => !newConceptIds.has(concept.id)),
      ...model.concepts.map((concept) => {
        const previous = oldConceptById.get(concept.id);
        return previous ? { ...previous, examImportance: concept.examImportance, difficulty: concept.difficulty } : concept;
      }),
    ],
    relationships: [...state.snapshot.relationships.filter((relationship) => !newRelationshipIds.has(relationship.id)), ...model.relationships],
    prompts: [...state.snapshot.prompts.filter((prompt) => !newPromptIds.has(prompt.conceptId)), ...model.prompts],
    learningActivities: [
      ...state.snapshot.learningActivities.filter((activity) => !newActivityIds.has(activity.conceptId)),
      ...model.learningActivities.map((activity) => {
        const previous = oldActivityById.get(activity.conceptId);
        const references = [...(previous?.sourceReferences ?? []), ...activity.sourceReferences];
        return { ...activity, sourceReferences: references.filter((reference, index) => references.findIndex((item) => item.materialId === reference.materialId && item.locator === reference.locator) === index) };
      }),
    ],
  }, state.nowIso);
  const next = { ...state, snapshot, diagnosisCompleted: state.diagnosisCompleted && existingConcepts.length > 0 };
  persistDemoState(next);
  return next;
}

/** A removed source cannot continue to supply questions or route stops. */
function withoutConcepts(state: DemoState, removedIds: Set<string>): DemoState {
  const snapshot: LearnerSnapshot = refreshCaches({
    ...state.snapshot,
    concepts: state.snapshot.concepts.filter((concept) => !removedIds.has(concept.id)),
    prompts: state.snapshot.prompts.filter((prompt) => !removedIds.has(prompt.conceptId)),
    learningActivities: state.snapshot.learningActivities.filter((activity) => !removedIds.has(activity.conceptId)),
    relationships: state.snapshot.relationships.filter((relationship) => !removedIds.has(relationship.fromId) && !removedIds.has(relationship.toId)),
    sessions: state.snapshot.sessions.map((session) =>
      session.status === "in_progress" && session.plannedConceptIds.some((id) => removedIds.has(id))
        ? { ...session, status: "abandoned" as const, endedAt: state.nowIso }
        : session,
    ),
    // Keep practice events as history. Reconfirming a topic from a surviving
    // source can recover its evidence without pretending the removed PDF exists.
  }, state.nowIso);
  return { ...state, snapshot, diagnosisCompleted: state.diagnosisCompleted && snapshot.concepts.length > 0 };
}

export function removeMaterialLearning(state: DemoState, materialId: string) {
  const removedIds = new Set(state.snapshot.learningActivities
    .filter((activity) => activity.sourceReferences.some((reference) => reference.materialId === materialId))
    .map((activity) => activity.conceptId));
  if (!removedIds.size) return state;
  const next = withoutConcepts(state, removedIds);
  persistDemoState(next);
  return next;
}

/** The learner chose their real exam date. Must be in the future. */
/**
 * Renames a course from the latest saved state, not a copy: it runs right after topics are confirmed, and a stale
 * copy would undo them.
 */
export function renameCourse(courseId: string, name: string, source: "notes" | "repair" | "user" = "notes") {
  const state = getDemoSnapshot();
  const clean = name.trim().slice(0, 90);
  if (!clean || !state.snapshot.courses.some((course) => course.id === courseId && (course.name !== clean || course.nameSource !== source))) return;
  persistDemoState({ ...state, snapshot: { ...state.snapshot, courses: state.snapshot.courses.map((course) => (course.id === courseId ? { ...course, name: clean, nameSource: source } : course)) } });
}

/** Renames a topic everywhere it is shown. From the latest saved state, like renameCourse. */
export function renameConcept(conceptId: string, name: string) {
  const state = getDemoSnapshot();
  const clean = name.trim().slice(0, 90);
  if (!clean) return;
  persistDemoState({ ...state, snapshot: refreshCaches({ ...state.snapshot, concepts: state.snapshot.concepts.map((concept) => (concept.id === conceptId ? { ...concept, name: clean } : concept)) }, state.nowIso) });
}

/** Puts back a state saved a moment ago: the undo after removing something. */
export function restoreDemoState(state: DemoState) {
  persistDemoState(state, true);
}

export function setExamDate(state: DemoState, date: string, targetPercent?: number) {
  const when = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.parse(state.nowIso)) throw new Error("Choose an exam date in the future.");
  // The aim is chosen with the date: until then no target is shown, because nobody set one.
  const target = typeof targetPercent === "number" && targetPercent >= 50 && targetPercent <= 100 ? Math.round(targetPercent) : undefined;
  const exams = state.snapshot.exams.map((exam) => (exam.isActive ? { ...exam, examDate: when.toISOString(), datePlaceholder: false, ...(target ? { targetPercent: target } : {}) } : exam));
  const next: DemoState = { ...state, snapshot: refreshCaches({ ...state.snapshot, exams }, state.nowIso) };
  persistDemoState(next);
  return next;
}

/** Take one topic out of the course (it was not a real topic). Its practice history stays as history. */
export function removeConcept(state: DemoState, conceptId: string) {
  const next = withoutConcepts(state, new Set([conceptId]));
  persistDemoState(next);
  return next;
}

/**
 * Older versions could make topics out of a file name ("Material", "Youssef"). Nothing in the file supports
 * them, so they are removed from saved data instead of being studied.
 */
export function purgeUnsourcedTopics(state: DemoState): { state: DemoState; changed: boolean } {
  const ids = new Set(state.snapshot.learningActivities
    .filter((activity) => (activity.sourceReferences.length > 0 && activity.sourceReferences.every((reference) => reference.locator === "From filename"))
      // A topic made from scan noise has nothing to learn from and only produces nonsense questions.
      || !looksReadable([activity.learn.explanation, ...activity.learn.keyPoints].join(" ")))
    .map((activity) => activity.conceptId));
  return ids.size ? { state: withoutConcepts(state, ids), changed: true } : { state, changed: false };
}

/** Topics saved before names were checked can be called "1" or "2": give each a name from its own text. */
export function nameNumberedTopics(state: DemoState): { state: DemoState; changed: boolean } {
  if (state.snapshot.concepts.every((concept) => isNamedTopic(concept.name))) return { state, changed: false };
  const taken = new Set(state.snapshot.concepts.map((concept) => concept.name.toLocaleLowerCase()));
  const concepts = state.snapshot.concepts.map((concept) => {
    if (isNamedTopic(concept.name)) return concept;
    const activity = state.snapshot.learningActivities.find((item) => item.conceptId === concept.id);
    const text = activity ? [activity.learn.explanation, ...activity.learn.keyPoints].join("\n") : "";
    const locator = activity?.sourceReferences[0]?.locator ?? `Topic ${concept.name}`;
    let name = topicNameFrom(concept.name, text, locator);
    if (taken.has(name.toLocaleLowerCase())) name = `${name} (${locator})`;
    taken.add(name.toLocaleLowerCase());
    return { ...concept, name };
  });
  return { state: { ...state, snapshot: { ...state.snapshot, concepts } }, changed: true };
}

export function recordRetrieval(state: DemoState, input: {
  conceptId: string;
  sessionId: string;
  promptId: string;
  responseText: string;
  outcome: RetrievalOutcome;
  responseTimeMs?: number | null;
  answerRevealed?: boolean;
}) {
  const concept = state.snapshot.concepts.find((item) => item.id === input.conceptId);
  const session = state.snapshot.sessions.find((item) => item.id === input.sessionId);
  if (!concept || !session) return state;
  const event = createRetrievalEvent({
    id: `evt-${crypto.randomUUID()}`,
    userId: state.snapshot.profile.id,
    concept,
    sessionId: input.sessionId,
    promptId: input.promptId,
    responseText: input.responseText,
    outcome: input.outcome,
    responseTimeMs: input.responseTimeMs,
    answerRevealed: input.answerRevealed,
    createdAt: state.nowIso,
  });
  let snapshot = refreshCaches({ ...state.snapshot, events: [...state.snapshot.events, event] }, state.nowIso);
  const recalculated = recalculateSessionRoute({ snapshot, session, previousRoute: session.latestRoute, nowIso: state.nowIso });
  const movedConcept = recalculated.change?.movedConceptId
    ? snapshot.concepts.find((item) => item.id === recalculated.change?.movedConceptId)
    : null;
  const explainedChange = recalculated.change?.meaningful ? {
    ...recalculated.change,
    explanation: `Your ${input.outcome === "success" ? "independent" : input.outcome === "partial" ? "partial" : "not-yet"} answer on ${concept.name} changed its mastery estimate.${movedConcept ? ` ${movedConcept.name} now has higher learning value for the remaining time.` : " Kelus recalculated the remaining route."}`,
  } : recalculated.change;
  const completedIds = [...new Set(snapshot.events.filter((item) => item.sessionId === session.id && item.kind === "retrieval").map((item) => item.conceptId))];
  const originalIds = session.initialRoute.allocations
    .map((item) => item.conceptId)
    .filter((id): id is string => id !== "mixed-retrieval");
  const futureIds = recalculated.route.allocations
    .map((item) => item.conceptId)
    .filter((id): id is string => id !== "mixed-retrieval" && originalIds.includes(id) && !completedIds.includes(id));
  const unchangedRemaining = originalIds.filter((id) => !completedIds.includes(id) && !futureIds.includes(id));
  const sessions = snapshot.sessions.map((item) => item.id === session.id ? {
    ...item,
    plannedConceptIds: [...completedIds, ...futureIds, ...unchangedRemaining],
    latestRoute: recalculated.route,
    routeChanges: explainedChange?.meaningful ? [...item.routeChanges, explainedChange] : item.routeChanges,
  } : item);
  snapshot = { ...snapshot, sessions };
  const next = { ...state, snapshot };
  persistDemoState(next);
  return next;
}

/** `firstConceptId` opens the block on that topic (from its own page); the rest follow in the route's order. */
export function startSession(state: DemoState, courseId: string, examId: string, firstConceptId?: string) {
  const exam = state.snapshot.exams.find((item) => item.id === examId);
  if (!exam) throw new Error("Active exam missing.");
  const route = generateRoute({
    concepts: state.snapshot.concepts.filter((concept) => concept.courseId === courseId),
    relationships: state.snapshot.relationships,
    events: state.snapshot.events,
    exam,
    nowIso: state.nowIso,
  });
  // Topics answered in the last few hours rest behind the others: the same order Today shows.
  const plannedConceptIds = restAware(route.allocations, state.snapshot.events, state.nowIso, state.snapshot.concepts.filter((concept) => concept.courseId === courseId)).map((item) => item.conceptId).filter((id): id is string => id !== "mixed-retrieval");
  if (firstConceptId && state.snapshot.concepts.some((concept) => concept.id === firstConceptId && concept.courseId === courseId)) {
    const rest = plannedConceptIds.filter((id) => id !== firstConceptId);
    plannedConceptIds.splice(0, plannedConceptIds.length, firstConceptId, ...rest);
  }
  const abandoned = state.snapshot.sessions.map((item) =>
    item.courseId === courseId && item.status === "in_progress"
      ? { ...item, status: "abandoned" as const, endedAt: state.nowIso }
      : item,
  );
  const session: StudySession = {
    id: `session-${crypto.randomUUID()}`,
    userId: state.snapshot.profile.id,
    courseId,
    examId,
    startedAt: state.nowIso,
    endedAt: null,
    plannedMinutes: route.availableMinutes,
    readinessBefore: estimatedReadiness(state.snapshot.concepts.filter((concept) => concept.courseId === courseId)),
    plannedConceptIds,
    initialRoute: route,
    latestRoute: route,
    routeChanges: [],
    status: "in_progress",
    summary: null,
  };
  const next = { ...state, snapshot: { ...state.snapshot, sessions: [...abandoned, session] } };
  persistDemoState(next);
  return { state: next, session };
}

export function abandonSession(state: DemoState, sessionId: string) {
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in_progress") return state;
  const sessions = state.snapshot.sessions.map((item) =>
    item.id === sessionId
      ? { ...item, status: "abandoned" as const, endedAt: state.nowIso }
      : item,
  );
  const next = { ...state, snapshot: { ...state.snapshot, sessions } };
  persistDemoState(next);
  return next;
}

export function finishSession(state: DemoState, sessionId: string, before: Concept[]) {
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  if (!session) return state;
  const after = state.snapshot.concepts.filter((concept) => concept.courseId === session.courseId);
  const summary = sessionSummary(before.filter((concept) => concept.courseId === session.courseId), after);
  summary.readinessBefore = session.readinessBefore;
  const sessions = state.snapshot.sessions.map((item) => item.id === sessionId
    ? { ...item, status: "complete" as const, endedAt: state.nowIso, summary }
    : item);
  const next = { ...state, snapshot: { ...state.snapshot, sessions } };
  persistDemoState(next);
  markSessionCompleted(state.nowIso);
  return next;
}

export function shiftDemoDay(state: DemoState, days = 1) {
  if (!isDemoClockEnabled()) return state;
  const nowIso = advanceDemoClock(state.nowIso, days);
  const next = { ...state, snapshot: refreshCaches(state.snapshot, nowIso), nowIso };
  persistDemoState(next);
  return next;
}

export { ALGORITHM_KIND };
