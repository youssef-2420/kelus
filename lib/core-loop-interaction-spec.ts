/**
 * Core-loop interaction specification
 * (/interaction-design:design-interaction for materials ingest + initial diagnosis)
 *
 * Tokens: kelusDuration / kelusEase (Notion-quiet). Bounce 0. Prefer opacity over travel.
 * Doherty: acknowledge press <100ms; show status if work >400ms; progress/cancel if >10s (OCR).
 */

export type MicroInteraction = {
  name: string;
  trigger: string;
  rules: string;
  feedback: string;
  duration: string;
  gesture: string;
  keyboardAlt: string;
  a11y: string;
};

/** Materials PDF ingest — primary interactions */
export const MATERIALS_INTERACTIONS: MicroInteraction[] = [
  {
    name: "Drop or choose PDF",
    trigger: "Pointer drop on zone, or activate hidden file input (click/keyboard).",
    rules: "Reject >20MB → failed(generic). Else WORK_STARTED(saving) within same tick, then extract/OCR/build.",
    feedback: "Drag: is-dragging highlight. Busy: aria-busy + live status text. Instant press scale on :active.",
    duration: "Press 80–100ms. Status copy updates as steps change (no spinner flash under 400ms).",
    gesture: "Drag-drop is enhancement only.",
    keyboardAlt: "Tab to drop zone → Enter/Space opens file picker.",
    a11y: "Label wraps input; focus-within ring; disabled while working.",
  },
  {
    name: "OCR progress + cancel",
    trigger: "System enters working(ocr); user activates Cancel OCR.",
    rules: "AbortController abort → failed(ocr) with recoverable copy + rescue CTAs.",
    feedback: "role=status aria-live=polite; Cancel adjacent to status.",
    duration: "OCR may exceed 10s — cancel required; progress messages via onProgress.",
    gesture: "None.",
    keyboardAlt: "Tab to Cancel OCR → Enter.",
    a11y: "Cancel never gesture-only; announce status changes.",
  },
  {
    name: "Concept review → confirm",
    trigger: "REVIEW_READY after build; user toggles/names concepts; Build map.",
    rules: "Distinct names required; CONFIRM_FAILED keeps review + softNotice.",
    feedback: "Focus concept-confirmation-title; checkboxes + name fields; softNotice as status/alert.",
    duration: "Panel enter/exit opacity 200ms (micro if reduced motion).",
    gesture: "None.",
    keyboardAlt: "Tab through proposals; Space toggles; Enter on Build CTA.",
    a11y: "Checkbox labelled by name input id; focus move on phase enter.",
  },
  {
    name: "Ready → continue / add another",
    trigger: "CONFIRM success.",
    rules: "ADD_ANOTHER → idle. Continue navigates /today.",
    feedback: "Focus material-ready-title; primary Continue CTA.",
    duration: "Opacity presence 200ms.",
    gesture: "None.",
    keyboardAlt: "Tab links/buttons.",
    a11y: "H2 focusable tabIndex=-1 for SR/context.",
  },
];

export const MATERIALS_LOADING = {
  under400ms: "No spinner — press state + immediate WORK_STARTED copy is enough.",
  under10s: "Indeterminate step label: Saving → Reading → OCR → Building.",
  over10s: "OCR only: live progress + Cancel OCR.",
} as const;

export const MATERIALS_ERRORS = {
  prevention: "accept=pdf, 20MB guard before upload work, bookmarks cannot become concepts.",
  detection: "size reject, save throw, OCR empty/timeout/abort, empty proposals, confirm name clash.",
  communication: "Near ingest; human copy; OCR vs generic rescue.",
  recovery: "Retry file, sample course, Review later, Add another source; preserve review selections on confirm fail.",
} as const;

export const DIAGNOSIS_INTERACTIONS: MicroInteraction[] = [
  {
    name: "Rate familiarity",
    trigger: "Tap/click rating chip.",
    rules: "RATE only in rating phase; one value per concept; Continue/Skip disabled until allRated.",
    feedback: "aria-pressed + is-selected; instant :active scale; CTA label flips when ready.",
    duration: "Press ≤100ms visual.",
    gesture: "None required.",
    keyboardAlt: "Tab to chip → Enter/Space.",
    a11y: "role=group per concept; colour never sole selected cue (selected border/fill + pressed).",
  },
  {
    name: "Answer recall prompt",
    trigger: "BEGIN_CHECKS → answering; typing in textarea.",
    rules: "SET_ANSWER; Compare enabled when answer.trim().",
    feedback: "Autofocus textarea; disabled Compare until non-empty.",
    duration: "Phase crossfade opacity 200ms.",
    gesture: "None.",
    keyboardAlt: "Tab to textarea and Compare.",
    a11y: "Label for diagnosis-answer; check counter in kicker.",
  },
  {
    name: "Compare → grade evidence",
    trigger: "Compare answer → revealed; grade buttons.",
    rules: "COMPARE attaches evaluation; GRADE_NEXT or finish via onComplete.",
    feedback: "Focus evaluation title; role=status; outcome class + criteria ticks (not colour alone).",
    duration: "Reveal block opacity 200ms; no bounce.",
    gesture: "None.",
    keyboardAlt: "Tab grade buttons.",
    a11y: "Evaluation announced; criteria list with text marks ✓/○.",
  },
];

export const DIAGNOSIS_LOADING = {
  under400ms: "Rating and compare are sync — no loading chrome.",
  notes: "No network wait in this flow; keep feedback instantaneous.",
} as const;

export const DIAGNOSIS_ERRORS = {
  prevention: "Disable Continue/Skip until rated; disable Compare while empty.",
  detection: "Empty answer blocked by guard; no retrieval concept → complete early.",
  communication: "Prevention via disabled CTAs + label change, not blame alerts.",
  recovery: "Skip recall path; grade overrides for partial/failure honesty.",
} as const;

export const PHASE_MOTION = {
  ease: [0.4, 0, 0.2, 1] as const,
  enterMs: 200,
  exitMs: 150,
  pressMs: 80,
  reducedMotion: "opacity only or instant; no y travel; no long stagger in these flows.",
} as const;
