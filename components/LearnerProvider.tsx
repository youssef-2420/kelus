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
  readStoredDemoState,
  clearStoredDemoState,
  chooseLocalStateForSignIn,
  getDemoStateOwner,
  recordRetrieval,
  removeMaterialLearning,
  removeConcept,
  setExamDate,
  loadAminaDemo,
  resetDemoState,
  replaceDemoState,
  shiftDemoDay,
  startSession,
  stateForAuthenticatedUser,
  setDemoStateOwner,
  subscribeDemoState,
  type DemoState,
  mergeMissedLines,
  renameCourse,
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
  removeMaterialSource: (materialId: string) => void;
  removeTopic: (conceptId: string) => void;
  setExamDate: (date: string) => void;
  renameCourse: (courseId: string, name: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const state = useSyncExternalStore(subscribeDemoState, getDemoSnapshot, getServerDemoSnapshot);
  const activeUserId = auth.user?.id ?? null;
  const materialOwner = useSyncExternalStore(subscribeMaterials, getMaterialOwner, () => null);
  const scopeAligned = getDemoStateOwner() === activeUserId && materialOwner === activeUserId;
  const syncedUser = useRef<string | null>(null);
  const lastWritten = useRef("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [materialClaim, setMaterialClaim] = useState<{ userId: string; claimGuest: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const userId = activeUserId;
    const previousOwner = getDemoStateOwner();
    const guestBeforeSwitch = previousOwner === null ? readStoredDemoState(null) : null;
    setDemoStateOwner(userId);
    if (!userId) {
      syncedUser.current = null;
      lastWritten.current = "";
      queueMicrotask(() => { if (active) setMaterialClaim(null); });
      return () => { active = false; };
    }
    syncedUser.current = null;
    queueMicrotask(() => { if (active) setSyncMessage("Syncing your learning route…"); });
    readLearnerState(userId).then((remote) => {
      if (!active) return;
      if (remote) {
        // The account's state wins, but missed lines from this device join it, so a warm-up never loses a line.
        const localMissed = mergeMissedLines(readStoredDemoState(userId)?.missedLines, guestBeforeSwitch?.missedLines);
        const claimed = stateForAuthenticatedUser({ ...remote, missedLines: mergeMissedLines(remote.missedLines, localMissed) }, userId);
        replaceDemoState(claimed);
        // Remember the account's copy, not the merge, so the merged lines are written back on the next sync.
        lastWritten.current = JSON.stringify(stateForAuthenticatedUser(remote, userId));
        setMaterialClaim({ userId, claimGuest: false });
      } else {
        // Capture the guest before switching scopes. The account's own local
        // state wins over a guest route; another account is never re-keyed.
        const local = chooseLocalStateForSignIn(readStoredDemoState(userId), guestBeforeSwitch, getDemoSnapshot());
        const claimed = stateForAuthenticatedUser(local.state, userId);
        replaceDemoState(claimed);
        lastWritten.current = JSON.stringify(claimed);
        if (local.claimGuest) clearStoredDemoState(null);
        setMaterialClaim({ userId, claimGuest: local.claimGuest });
        void writeLearnerState(userId, claimed).catch(() => setSyncMessage("Saved on this device. Cloud sync will retry."));
      }
      syncedUser.current = userId;
      setSyncMessage(null);
    }).catch(() => {
      if (!active) return;
      syncedUser.current = userId;
      setMaterialClaim({ userId, claimGuest: false });
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
    if (materialClaim?.userId !== userId) return () => { active = false; };

    void (async () => {
      try {
        if (materialClaim.claimGuest) await claimGuestMaterials(userId);
        else setMaterialOwner(userId);
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
  }, [activeUserId, materialClaim]);
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
    removeMaterialSource(materialId) {
      removeMaterialLearning(state, materialId);
    },
    removeTopic(conceptId) {
      removeConcept(state, conceptId);
    },
    setExamDate(date) {
      setExamDate(state, date);
    },
    renameCourse(courseId, name) {
      renameCourse(courseId, name);
    },
  }), [state]);
  return <StoreContext.Provider value={store}>{auth.user && syncMessage ? <p className="learner-sync-status" role="status">{syncMessage}</p> : null}{scopeAligned ? children : <p className="learner-sync-status" role="status">Loading your private learning route…</p>}</StoreContext.Provider>;
}

export function useLearner() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("LearnerProvider missing");
  return value;
}
