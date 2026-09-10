import type { AnswerEvaluation } from "@/domain/answer-evaluation";
import type { RetrievalOutcome, SelfRating } from "@/domain/types";

/**
 * Initial diagnosis state machine
 *
 * ```
 * rating ──RATE──► rating
 * rating ──BEGIN_CHECKS──► answering     [guard: allRated + next concept]
 * rating ──BEGIN_CHECKS──► (complete)    [guard: allRated + no concept]
 * rating ──SKIP──► (complete)            [guard: allRated]
 *
 * answering ──SET_ANSWER──► answering
 * answering ──COMPARE──► revealed        [guard: answer.trim()]
 *
 * revealed ──GRADE──► answering          [next concept]
 * revealed ──GRADE──► (complete)         [no further checks]
 * ```
 *
 * Impossible combinations prevented by exclusive `status`:
 * - revealed without evaluation
 * - answering + revealed together
 * - rating UI while in a recall check
 */

export type DiagnosisRetrieval = {
  conceptId: string;
  promptId: string;
  responseText: string;
  outcome: RetrievalOutcome;
  responseTimeMs: number;
};

export type DiagnosisPhase =
  | { status: "rating" }
  | {
      status: "answering";
      conceptId: string;
      reason: string;
      answer: string;
    }
  | {
      status: "revealed";
      conceptId: string;
      reason: string;
      answer: string;
      evaluation: AnswerEvaluation;
    };

export type DiagnosisState = {
  phase: DiagnosisPhase;
  ratings: Record<string, SelfRating>;
  retrievals: DiagnosisRetrieval[];
};

export type DiagnosisEvent =
  | { type: "RATE"; conceptId: string; rating: SelfRating }
  | { type: "BEGIN_CHECKS"; conceptId: string; reason: string }
  | { type: "SET_ANSWER"; answer: string }
  | { type: "COMPARE"; evaluation: AnswerEvaluation }
  | {
      type: "GRADE_NEXT";
      retrieval: DiagnosisRetrieval;
      conceptId: string;
      reason: string;
    }
  | { type: "GRADE_FINISH"; retrieval: DiagnosisRetrieval };

export const INITIAL_DIAGNOSIS_STATE: DiagnosisState = {
  phase: { status: "rating" },
  ratings: {},
  retrievals: [],
};

export function reduceDiagnosis(state: DiagnosisState, event: DiagnosisEvent): DiagnosisState {
  switch (event.type) {
    case "RATE":
      if (state.phase.status !== "rating") return state;
      return {
        ...state,
        ratings: { ...state.ratings, [event.conceptId]: event.rating },
      };

    case "BEGIN_CHECKS":
      if (state.phase.status !== "rating") return state;
      return {
        ...state,
        phase: {
          status: "answering",
          conceptId: event.conceptId,
          reason: event.reason,
          answer: "",
        },
      };

    case "SET_ANSWER":
      if (state.phase.status !== "answering") return state;
      return {
        ...state,
        phase: { ...state.phase, answer: event.answer },
      };

    case "COMPARE":
      if (state.phase.status !== "answering") return state;
      if (!state.phase.answer.trim()) return state;
      return {
        ...state,
        phase: {
          status: "revealed",
          conceptId: state.phase.conceptId,
          reason: state.phase.reason,
          answer: state.phase.answer,
          evaluation: event.evaluation,
        },
      };

    case "GRADE_NEXT": {
      if (state.phase.status !== "revealed") return state;
      return {
        ratings: state.ratings,
        retrievals: [...state.retrievals, event.retrieval],
        phase: {
          status: "answering",
          conceptId: event.conceptId,
          reason: event.reason,
          answer: "",
        },
      };
    }

    case "GRADE_FINISH": {
      if (state.phase.status !== "revealed") return state;
      return {
        ...state,
        retrievals: [...state.retrievals, event.retrieval],
        // Stay on revealed until parent unmounts after onComplete; retrievals are final.
        phase: state.phase,
      };
    }

    default:
      return state;
  }
}

export function allRated(ratings: Record<string, SelfRating>, conceptIds: string[]): boolean {
  return conceptIds.every((id) => Boolean(ratings[id]));
}

export function canCompare(phase: DiagnosisPhase): boolean {
  return phase.status === "answering" && Boolean(phase.answer.trim());
}

export function activeConceptId(phase: DiagnosisPhase): string | null {
  if (phase.status === "answering" || phase.status === "revealed") return phase.conceptId;
  return null;
}

export function isRevealed(phase: DiagnosisPhase): boolean {
  return phase.status === "revealed";
}

/** Per-phase UI contract (map-states steps 3–6). */
export const DIAGNOSIS_PHASE_UI = {
  rating: {
    loading: "None — synchronous rating buttons.",
    error: "Continue/Skip disabled until every topic is rated (prevention, not alert).",
    feedback: "aria-pressed on selected rating; CTA label flips when allRated.",
    animation: "Static panel; no phase motion required.",
  },
  answering: {
    loading: "None — learner is writing.",
    error: "Compare stays disabled while answer empty.",
    feedback: "Autofocus textarea; live check counter in kicker.",
    animation: "Swap rating→check via conditional render (opacity ok if added later).",
  },
  revealed: {
    loading: "None — evaluation computed synchronously.",
    error: "None (evaluation is guidance, not a hard error).",
    feedback: "role=status evaluation; outcome class + criteria ticks; grade buttons.",
    animation: "Feedback block appears in place; prefer opacity if motion added.",
  },
} as const;
