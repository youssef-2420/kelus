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
  clearStoredDemoState,
  getDemoStateOwner,
  recordRetrieval,
  loadAminaDemo,
  resetDemoState,
  replaceDemoState,
  shiftDemoDay,
  startSession,
  stateForAuthenticatedUser,
  setDemoStateOwner,
  subscribeDemoState,
  type DemoState,
} from "@/lib/demo-store";
import type { Concept, ExtractedMaterialPage, ProposedConcept, RetrievalOutcome, SelfRating } from "@/domain/types";
import type { SetupInput } from "@/lib/setup";
import { readLearnerState, writeLearnerState } from "@/lib/learner-sync";
import { claimGuestMaterials, getMaterialOwner, setMaterialOwner, subscribeMaterials } from "@/lib/material-store";
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
  const activeUserId = auth.user?.id ?? null;
  // Align owner before paint when auth resolves so Today/Map do not blank for a frame.
  if (getDemoStateOwner() !== activeUserId) setDemoStateOwner(activeUserId);
  const materialOwner = useSyncExternalStore(subscribeMaterials, getMaterialOwner, () => null);
  const scopeAligned = getDemoStateOwner() === activeUserId && materialOwner === activeUserId;
  const syncedUser = useRef<string | null>(null);
  const lastWritten = useRef("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const userId = activeUserId;
    const previousOwner = getDemoStateOwner();
    setDemoStateOwner(userId);
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
        // Only an anonymous scope may be claimed. A previous account's local
        // state is never re-keyed into a different account.
        const localState = getDemoSnapshot();
        const claimed = stateForAuthenticatedUser(previousOwner === null ? localState : getDemoSnapshot(), userId);
        replaceDemoState(claimed);
        lastWritten.current = JSON.stringify(claimed);
        if (previousOwner === null) clearStoredDemoState(null);
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
  }, [activeUserId]);

  useEffect(() => {
    const userId = activeUserId;
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
  }, [activeUserId, state]);

  useEffect(() => {
    const userId = activeUserId;
    let active = true;
    let initialized = false;
    let timeout: number | null = null;

    if (!userId) {
      setMaterialOwner(null);
      return () => { active = false; };
    }

    void (async () => {
      try {
        // Always check the isolated guest scope. It may contain materials added
        // before sign-in, while the learner scope effect may already have
        // switched its owner by the time this effect runs.
        await claimGuestMaterials(userId);
        if (!active) return;
        await initializeMaterialSync(userId);
        if (active) initialized = true;
      } catch {
        if (active) setSyncMessage("Your route is saved. Material sync needs the Supabase materials migration.");
      }
    })();

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
  }, [activeUserId]);
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
  const blockForPrivateScope = Boolean(auth.user) && !auth.loading && !scopeAligned;
  return <StoreContext.Provider value={store}>{auth.user && syncMessage ? <p className="learner-sync-status" role="status">{syncMessage}</p> : null}{blockForPrivateScope ? <p className="learner-sync-status" role="status">Loading your private learning route…</p> : children}</StoreContext.Provider>;
}

export function useLearner() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("LearnerProvider missing");
  return value;
}
