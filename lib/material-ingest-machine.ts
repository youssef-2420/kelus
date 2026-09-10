import type { CourseMaterial, ExtractedMaterialPage, ProposedConcept } from "@/domain/types";

/**
 * Materials PDF ingest state machine
 *
 * ```
 * idle ──dragEnter──► idle(dragging)
 * idle(dragging) ──dragLeave──► idle
 * idle ──pick/drop──► working(saving)     [guard: file present, size ≤ 20MB]
 * idle ──sizeReject──► failed(generic)
 * idle ──linkFail──► failed(generic)
 * idle ──linkOk──► idle
 *
 * working(saving) ──saved──► working(extracting)
 * working(saving) ──fail──► failed(generic)
 * working(extracting) ──needOcr──► working(ocr)
 * working(extracting) ──build──► working(building)
 * working(ocr) ──progress──► working(ocr)          [message update]
 * working(ocr) ──cancel──► failed(ocr)
 * working(ocr) ──done──► working(building)
 * working(*) ──fail──► failed(ocr|generic)
 * working(building) ──ready──► review
 *
 * review ──confirm──► confirmed
 * review ──confirmFail──► review + softNotice? / failed overlay stays review with error — we use failed
 * review ──later──► idle
 * confirmed ──addAnother──► idle
 * failed ──retry/newAttempt──► working | idle
 * ```
 *
 * Impossible combinations prevented by exclusive `status`:
 * - busy + review, busy + confirmed, ocr + review
 * - dragging while working/review/confirmed
 * - errorKind without failed status
 *
 * Soft cloud-sync warnings are non-blocking (`softNotice`) and never
 * replace an in-flight working/review/confirmed phase.
 */

export type WorkingStep = "saving" | "extracting" | "ocr" | "building";
export type ErrorKind = "ocr" | "generic";

export type AnalysisPayload = {
  material: CourseMaterial;
  proposals: ProposedConcept[];
  pages: ExtractedMaterialPage[];
};

export type IngestPhase =
  | { status: "idle"; dragging: boolean }
  | { status: "working"; step: WorkingStep; message: string }
  | { status: "failed"; kind: ErrorKind; message: string }
  | { status: "review"; analysis: AnalysisPayload }
  | { status: "confirmed"; conceptCount: number; firstName: string | null };

export type IngestState = {
  phase: IngestPhase;
  /** Non-blocking notice (e.g. encrypted cloud copy queued). Cleared on new attempts. */
  softNotice: string | null;
};

export type IngestEvent =
  | { type: "DRAG_ENTER" }
  | { type: "DRAG_LEAVE" }
  | { type: "DROP_RESET" }
  | { type: "SIZE_REJECTED"; message: string }
  | { type: "LINK_FAILED"; message: string }
  | { type: "CLEAR_FEEDBACK" }
  | { type: "WORK_STARTED"; step: WorkingStep; message: string }
  | { type: "WORK_STEP"; step: WorkingStep; message: string }
  | { type: "WORK_PROGRESS"; message: string }
  | { type: "SOFT_NOTICE"; message: string }
  | { type: "FAIL"; kind: ErrorKind; message: string }
  | { type: "REVIEW_READY"; analysis: AnalysisPayload }
  | { type: "CONFIRM"; conceptCount: number; firstName: string | null }
  | { type: "CONFIRM_FAILED"; message: string }
  | { type: "REVIEW_LATER" }
  | { type: "ADD_ANOTHER" };

export const INITIAL_INGEST_STATE: IngestState = {
  phase: { status: "idle", dragging: false },
  softNotice: null,
};

const DEFAULT_STEP_MESSAGE: Record<WorkingStep, string> = {
  saving: "Saving your PDF…",
  extracting: "Reading PDF text…",
  ocr: "Reading scanned pages…",
  building: "Building concepts…",
};

export function defaultStepMessage(step: WorkingStep) {
  return DEFAULT_STEP_MESSAGE[step];
}

export function reduceIngest(state: IngestState, event: IngestEvent): IngestState {
  const { phase } = state;

  switch (event.type) {
    case "DRAG_ENTER":
      if (phase.status !== "idle") return state;
      return { ...state, phase: { status: "idle", dragging: true } };

    case "DRAG_LEAVE":
    case "DROP_RESET":
      if (phase.status !== "idle") return state;
      return { ...state, phase: { status: "idle", dragging: false } };

    case "SIZE_REJECTED":
    case "LINK_FAILED":
      return {
        softNotice: null,
        phase: { status: "failed", kind: "generic", message: event.message },
      };

    case "CLEAR_FEEDBACK":
      if (phase.status === "failed") {
        return { softNotice: null, phase: { status: "idle", dragging: false } };
      }
      return { ...state, softNotice: null };

    case "WORK_STARTED":
      return {
        softNotice: null,
        phase: {
          status: "working",
          step: event.step,
          message: event.message || defaultStepMessage(event.step),
        },
      };

    case "WORK_STEP":
      if (phase.status !== "working" && phase.status !== "idle" && phase.status !== "failed") {
        return state;
      }
      return {
        ...state,
        phase: {
          status: "working",
          step: event.step,
          message: event.message || defaultStepMessage(event.step),
        },
      };

    case "WORK_PROGRESS":
      if (phase.status !== "working") return state;
      return {
        ...state,
        phase: { ...phase, message: event.message },
      };

    case "SOFT_NOTICE":
      return { ...state, softNotice: event.message };

    case "FAIL":
      return {
        softNotice: null,
        phase: { status: "failed", kind: event.kind, message: event.message },
      };

    case "REVIEW_READY":
      return {
        ...state,
        phase: { status: "review", analysis: event.analysis },
      };

    case "CONFIRM":
      if (phase.status !== "review") return state;
      return {
        softNotice: null,
        phase: {
          status: "confirmed",
          conceptCount: event.conceptCount,
          firstName: event.firstName,
        },
      };

    case "CONFIRM_FAILED":
      // Stay on review so selections are preserved; surface as failed only if we left review —
      // keep review + softNotice would hide alert. Use failed with message but lose review —
      // better: keep review and put message in softNotice with alert role in UI.
      if (phase.status !== "review") return state;
      return { ...state, softNotice: event.message };

    case "REVIEW_LATER":
      if (phase.status !== "review") return state;
      return { softNotice: null, phase: { status: "idle", dragging: false } };

    case "ADD_ANOTHER":
      if (phase.status !== "confirmed" && phase.status !== "failed") return state;
      return { softNotice: null, phase: { status: "idle", dragging: false } };

    default:
      return state;
  }
}

/** UI / guard helpers — single source so impossible combos can't be read from booleans. */

export function isBusy(phase: IngestPhase): boolean {
  return phase.status === "working";
}

export function isOcrRunning(phase: IngestPhase): boolean {
  return phase.status === "working" && phase.step === "ocr";
}

export function isDragging(phase: IngestPhase): boolean {
  return phase.status === "idle" && phase.dragging;
}

export function showIngestForm(phase: IngestPhase): boolean {
  return phase.status === "idle" || phase.status === "working" || phase.status === "failed";
}

export function statusMessage(phase: IngestPhase): string | null {
  return phase.status === "working" ? phase.message : null;
}

export function errorMessage(phase: IngestPhase): string | null {
  return phase.status === "failed" ? phase.message : null;
}

export function errorKind(phase: IngestPhase): ErrorKind | null {
  return phase.status === "failed" ? phase.kind : null;
}

export function reviewAnalysis(phase: IngestPhase): AnalysisPayload | null {
  return phase.status === "review" ? phase.analysis : null;
}

export function readySummary(
  phase: IngestPhase,
): { conceptCount: number; firstName: string | null } | null {
  return phase.status === "confirmed"
    ? { conceptCount: phase.conceptCount, firstName: phase.firstName }
    : null;
}

export function canStartUpload(phase: IngestPhase): boolean {
  return phase.status === "idle" || phase.status === "failed";
}

export function focusTargetId(phase: IngestPhase): string | null {
  if (phase.status === "review") return "concept-confirmation-title";
  if (phase.status === "confirmed") return "material-ready-title";
  return null;
}
