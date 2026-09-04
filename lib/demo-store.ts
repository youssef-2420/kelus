import { createDemoSnapshot } from "../data/demo-seed";
import { ALGORITHM_KIND } from "../domain/constants";
import { advanceDemoClock, isDemoClockEnabled } from "../domain/demo-clock";
import { recomputeConceptCache, withCachedState } from "../domain/learner-model";
import { createRetrievalEvent, sessionSummary } from "../domain/session";
import type { Concept, LearnerSnapshot, LearningEvent, RetrievalOutcome, StudySession } from "../domain/types";
import { createLearnerSnapshot, type SetupInput } from "./setup";

const STORAGE_KEY = "kelus-demo-snapshot-v1";
const SERVER_NOW_MS = Date.parse("2026-09-03T12:00:00.000Z");

export type DemoState = {
  snapshot: LearnerSnapshot;
  nowIso: string;
  onboardingCompleted: boolean;
};

function refreshCaches(snapshot: LearnerSnapshot, nowIso: string): LearnerSnapshot {
  return {
    ...snapshot,
    concepts: snapshot.concepts.map((concept) => withCachedState(concept, recomputeConceptCache(concept, snapshot.events, nowIso))),
  };
}

export function initialDemoState(nowMs = Date.now()): DemoState {
  const snapshot = createDemoSnapshot(nowMs);
  const nowIso = new Date(nowMs).toISOString();
  return { snapshot: refreshCaches(snapshot, nowIso), nowIso, onboardingCompleted: false };
}

const SERVER_SNAPSHOT = initialDemoState(SERVER_NOW_MS);

export function readStoredDemoState(): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed?.snapshot?.concepts) return null;
    return {
      ...parsed,
      onboardingCompleted: parsed.onboardingCompleted === true,
      snapshot: refreshCaches(parsed.snapshot, parsed.nowIso),
    };
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
let clientCache: DemoState | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function persistDemoState(state: DemoState) {
  clientCache = state;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  emit();
}

export function subscribeDemoState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoSnapshot() {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (!clientCache) {
    clientCache = readStoredDemoState() ?? SERVER_SNAPSHOT;
  }
  return clientCache;
}

export function getServerDemoSnapshot() {
  return SERVER_SNAPSHOT;
}

export function resetDemoState(nowMs = Date.now()) {
  const state = initialDemoState(nowMs);
  persistDemoState(state);
  return state;
}

export function completeOnboarding(input: SetupInput, nowMs = Date.now()) {
  const nowIso = new Date(nowMs).toISOString();
  const state: DemoState = {
    snapshot: refreshCaches(createLearnerSnapshot(input, nowMs), nowIso),
    nowIso,
    onboardingCompleted: true,
  };
  persistDemoState(state);
  return state;
}

export function appendEvent(state: DemoState, event: LearningEvent): DemoState {
  const events = [...state.snapshot.events, event];
  const snapshot = refreshCaches({ ...state.snapshot, events }, state.nowIso);
  const next = { ...state, snapshot };
  persistDemoState(next);
  return next;
}

export function recordRetrieval(state: DemoState, input: {
  conceptId: string;
  sessionId: string;
  promptId: string;
  responseText: string;
  outcome: RetrievalOutcome;
}): DemoState {
  const concept = state.snapshot.concepts.find((item) => item.id === input.conceptId);
  if (!concept) return state;
  const event = createRetrievalEvent({
    id: `evt-${crypto.randomUUID()}`,
    userId: state.snapshot.profile.id,
    concept,
    sessionId: input.sessionId,
    promptId: input.promptId,
    responseText: input.responseText,
    outcome: input.outcome,
    createdAt: state.nowIso,
  });
  return appendEvent(state, event);
}

export function startSession(state: DemoState, plannedConceptIds: string[], plannedMinutes: number, courseId: string, examId: string): { state: DemoState; session: StudySession } {
  const session: StudySession = {
    id: `session-${crypto.randomUUID()}`,
    userId: state.snapshot.profile.id,
    courseId,
    examId,
    startedAt: state.nowIso,
    endedAt: null,
    plannedMinutes,
    plannedConceptIds,
    status: "in_progress",
    summary: null,
  };
  const next = {
    ...state,
    snapshot: { ...state.snapshot, sessions: [...state.snapshot.sessions, session] },
  };
  persistDemoState(next);
  return { state: next, session };
}

export function finishSession(state: DemoState, sessionId: string, before: Concept[]): DemoState {
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  if (!session) return state;
  const after = state.snapshot.concepts.filter((concept) => session.plannedConceptIds.includes(concept.id));
  const summary = sessionSummary(before, after);
  const sessions = state.snapshot.sessions.map((item) => item.id === sessionId
    ? { ...item, status: "complete" as const, endedAt: state.nowIso, summary }
    : item);
  const next = { ...state, snapshot: { ...state.snapshot, sessions } };
  persistDemoState(next);
  return next;
}

export function shiftDemoDay(state: DemoState, days = 1): DemoState {
  if (!isDemoClockEnabled()) return state;
  const nowIso = advanceDemoClock(state.nowIso, days);
  const next = { ...state, snapshot: refreshCaches(state.snapshot, nowIso), nowIso };
  persistDemoState(next);
  return next;
}

export { ALGORITHM_KIND };
