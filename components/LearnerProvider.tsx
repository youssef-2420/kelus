"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  finishSession,
  abandonSession,
  completeDiagnosis as persistDiagnosis,
  completeOnboarding,
  confirmMaterialConcepts,
  getDemoSnapshot,
  getServerDemoSnapshot,
  recordRetrieval,
  loadAminaDemo,
  resetDemoState,
  replaceDemoState,
  shiftDemoDay,
  startSession,
  stateForAuthenticatedUser,
  subscribeDemoState,
  type DemoState,
} from "@/lib/demo-store";
import type { Concept, ExtractedMaterialPage, ProposedConcept, RetrievalOutcome, SelfRating } from "@/domain/types";
import type { SetupInput } from "@/lib/setup";
import { readLearnerState, writeLearnerState } from "@/lib/learner-sync";
import { subscribeMaterials } from "@/lib/material-store";
import { flushMaterialSyncQueue, initializeMaterialSync, writeRemoteMaterialState } from "@/lib/material-sync";

type Store = {
  state: DemoState;
  start: (courseId: string, examId: string) => string;
  abandon: (sessionId: string) => void;
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
  confirmConcepts: (proposals: ProposedConcept[], pages?: ExtractedMaterialPage[]) => void;
};

const StoreContext = createContext<Store | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const state = useSyncExternalStore(subscribeDemoState, getDemoSnapshot, getServerDemoSnapshot);
  const syncedUser = useRef<string | null>(null);
  const lastWritten = useRef("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const userId = auth.user?.id;
    if (!userId) {
      syncedUser.current = null;
      lastWritten.current = "";
      return () => { active = false; };
    }
    syncedUser.current = null;
    queueMicrotask(() => { if (active) setSyncMessage("Syncing your learning route…"); });
    readLearnerState(userId).then((remote) => {
      if (!active) return;
      if (remote) {
        const claimed = stateForAuthenticatedUser(remote, userId);
        replaceDemoState(claimed);
        lastWritten.current = JSON.stringify(claimed);
      } else {
        const claimed = stateForAuthenticatedUser(state, userId);
        replaceDemoState(claimed);
        lastWritten.current = JSON.stringify(claimed);
        void writeLearnerState(userId, claimed).catch(() => setSyncMessage("Saved on this device. Cloud sync will retry."));
      }
      syncedUser.current = userId;
      setSyncMessage(null);
    }).catch(() => {
      if (!active) return;
      syncedUser.current = userId;
      setSyncMessage("Saved on this device. Cloud sync is unavailable.");
    });
    return () => { active = false; };
    // Load once when the authenticated account changes; live state writes are
    // handled by the separate debounced effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id]);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId || syncedUser.current !== userId) return;
    const claimed = stateForAuthenticatedUser(state, userId);
    const serialized = JSON.stringify(claimed);
    if (serialized === lastWritten.current) return;
    const timeout = window.setTimeout(() => {
      writeLearnerState(userId, claimed).then(() => {
        lastWritten.current = serialized;
        setSyncMessage(null);
      }).catch(() => setSyncMessage("Saved on this device. Cloud sync will retry."));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [auth.user?.id, state]);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId) return;
    let active = true;
    let initialized = false;
    let timeout: number | null = null;

    initializeMaterialSync(userId).then(() => {
      if (!active) return;
      initialized = true;
    }).catch(() => {
      if (active) setSyncMessage("Your route is saved. Material sync needs the Supabase materials migration.");
    });

    const retryPending = () => {
      void flushMaterialSyncQueue(userId).then((completed) => {
        if (active && completed > 0) setSyncMessage(null);
      });
    };
    window.addEventListener("online", retryPending);

    const unsubscribe = subscribeMaterials(() => {
      if (!initialized) return;
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        writeRemoteMaterialState(userId).catch(() => {
          if (active) setSyncMessage("Saved on this device. Material sync will retry after the next change.");
        });
      }, 500);
    });

    return () => {
      active = false;
      if (timeout) window.clearTimeout(timeout);
      unsubscribe();
      window.removeEventListener("online", retryPending);
    };
  }, [auth.user?.id]);
  const store = useMemo<Store>(() => ({
    state,
    start(courseId, examId) {
      return startSession(state, courseId, examId).session.id;
    },
    abandon(sessionId) {
      abandonSession(state, sessionId);
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
    confirmConcepts(proposals, pages) {
      confirmMaterialConcepts(state, proposals, pages);
    },
  }), [state]);
  return <StoreContext.Provider value={store}>{auth.user && syncMessage ? <p className="learner-sync-status" role="status">{syncMessage}</p> : null}{children}</StoreContext.Provider>;
}

export function useLearner() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("LearnerProvider missing");
  return value;
}
