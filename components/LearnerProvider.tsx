"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  finishSession,
  completeDiagnosis as persistDiagnosis,
  completeOnboarding,
  getDemoSnapshot,
  getServerDemoSnapshot,
  recordRetrieval,
  loadAminaDemo,
  resetDemoState,
  shiftDemoDay,
  startSession,
  subscribeDemoState,
  type DemoState,
} from "@/lib/demo-store";
import type { Concept, RetrievalOutcome, SelfRating } from "@/domain/types";
import type { SetupInput } from "@/lib/setup";

type Store = {
  state: DemoState;
  start: (courseId: string, examId: string) => string;
  submit: (input: {
    conceptId: string;
    sessionId: string;
    promptId: string;
    responseText: string;
    outcome: RetrievalOutcome;
    responseTimeMs?: number | null;
    answerRevealed?: boolean;
    finish?: { before: Concept[] };
  }) => void;
  reset: () => void;
  skipDay: () => void;
  completeSetup: (input: SetupInput) => void;
  completeDiagnosis: (input: {
    ratings: Record<string, SelfRating>;
    retrievals: Array<{ conceptId: string; promptId: string; responseText: string; outcome: RetrievalOutcome; responseTimeMs: number }>;
  }) => void;
  useDemo: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribeDemoState, getDemoSnapshot, getServerDemoSnapshot);
  const store = useMemo<Store>(() => ({
    state,
    start(courseId, examId) {
      return startSession(state, courseId, examId).session.id;
    },
    submit(input) {
      const next = recordRetrieval(state, input);
      if (input.finish) finishSession(next, input.sessionId, input.finish.before);
    },
    reset() {
      resetDemoState();
    },
    skipDay() {
      if (process.env.NODE_ENV !== "development") return;
      shiftDemoDay(state, 1);
    },
    completeSetup(input) {
      completeOnboarding(input);
    },
    completeDiagnosis(input) {
      persistDiagnosis(state, input);
    },
    useDemo() {
      loadAminaDemo();
    },
  }), [state]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useLearner() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("LearnerProvider missing");
  return value;
}
