import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_INGEST_STATE,
  errorKind,
  isBusy,
  isDragging,
  isOcrRunning,
  readySummary,
  reduceIngest,
  reviewAnalysis,
  showIngestForm,
} from "../lib/material-ingest-machine.ts";

const sampleAnalysis = {
  material: {
    id: "m1",
    courseId: "c1",
    kind: "pdf",
    title: "Syllabus",
    role: "syllabus",
    storage: "local",
    fileName: "syllabus.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1200,
    sourceUrl: null,
    addedAt: "2026-01-01T00:00:00.000Z",
    processingStatus: "ready",
  },
  proposals: [
    {
      id: "p1",
      name: "Osmosis",
      locator: "Page 2",
      materialId: "m1",
      sourceLabel: "Syllabus",
      sourceExcerpt: "Osmosis moves water across membranes.",
    },
  ],
  pages: [],
};

describe("material ingest state machine", () => {
  it("keeps idle and dragging mutually exclusive from working", () => {
    let state = INITIAL_INGEST_STATE;
    state = reduceIngest(state, { type: "DRAG_ENTER" });
    assert.equal(isDragging(state.phase), true);
    state = reduceIngest(state, { type: "WORK_STARTED", step: "saving", message: "Saving…" });
    assert.equal(isBusy(state.phase), true);
    assert.equal(isDragging(state.phase), false);
    state = reduceIngest(state, { type: "DRAG_ENTER" });
    assert.equal(isDragging(state.phase), false);
  });

  it("models OCR as a working step, not a parallel boolean", () => {
    let state = reduceIngest(INITIAL_INGEST_STATE, {
      type: "WORK_STARTED",
      step: "extracting",
      message: "Reading…",
    });
    state = reduceIngest(state, { type: "WORK_STEP", step: "ocr", message: "OCR…" });
    assert.equal(isOcrRunning(state.phase), true);
    assert.equal(isBusy(state.phase), true);
    state = reduceIngest(state, { type: "WORK_PROGRESS", message: "Page 2 of 4…" });
    assert.equal(state.phase.status, "working");
    assert.equal(state.phase.status === "working" && state.phase.message, "Page 2 of 4…");
  });

  it("fails OCR cancel into a recoverable failed(ocr) state", () => {
    let state = reduceIngest(INITIAL_INGEST_STATE, {
      type: "WORK_STARTED",
      step: "ocr",
      message: "OCR…",
    });
    state = reduceIngest(state, {
      type: "FAIL",
      kind: "ocr",
      message: "OCR cancelled.",
    });
    assert.equal(errorKind(state.phase), "ocr");
    assert.equal(showIngestForm(state.phase), true);
    assert.equal(reviewAnalysis(state.phase), null);
  });

  it("never shows review and confirmed together", () => {
    let state = reduceIngest(INITIAL_INGEST_STATE, {
      type: "REVIEW_READY",
      analysis: sampleAnalysis,
    });
    assert.ok(reviewAnalysis(state.phase));
    assert.equal(readySummary(state.phase), null);
    assert.equal(showIngestForm(state.phase), false);

    state = reduceIngest(state, {
      type: "CONFIRM",
      conceptCount: 1,
      firstName: "Osmosis",
    });
    assert.equal(reviewAnalysis(state.phase), null);
    assert.deepEqual(readySummary(state.phase), { conceptCount: 1, firstName: "Osmosis" });
  });

  it("keeps soft cloud notices from hijacking an in-flight phase", () => {
    let state = reduceIngest(INITIAL_INGEST_STATE, {
      type: "WORK_STARTED",
      step: "extracting",
      message: "Reading…",
    });
    state = reduceIngest(state, {
      type: "SOFT_NOTICE",
      message: "Encrypted copy will retry later.",
    });
    assert.equal(state.phase.status, "working");
    assert.equal(state.softNotice, "Encrypted copy will retry later.");
    assert.equal(errorKind(state.phase), null);

    state = reduceIngest(state, { type: "REVIEW_READY", analysis: sampleAnalysis });
    assert.equal(state.phase.status, "review");
    assert.equal(state.softNotice, "Encrypted copy will retry later.");
  });

  it("preserves review selections when confirm fails", () => {
    let state = reduceIngest(INITIAL_INGEST_STATE, {
      type: "REVIEW_READY",
      analysis: sampleAnalysis,
    });
    state = reduceIngest(state, {
      type: "CONFIRM_FAILED",
      message: "Each confirmed concept needs a distinct name.",
    });
    assert.equal(state.phase.status, "review");
    assert.equal(state.softNotice, "Each confirmed concept needs a distinct name.");
  });

  it("returns to idle from confirmed and failed", () => {
    let confirmed = reduceIngest(
      reduceIngest(INITIAL_INGEST_STATE, { type: "REVIEW_READY", analysis: sampleAnalysis }),
      { type: "CONFIRM", conceptCount: 1, firstName: "Osmosis" },
    );
    confirmed = reduceIngest(confirmed, { type: "ADD_ANOTHER" });
    assert.equal(confirmed.phase.status, "idle");

    let failed = reduceIngest(INITIAL_INGEST_STATE, {
      type: "SIZE_REJECTED",
      message: "Too large",
    });
    failed = reduceIngest(failed, { type: "ADD_ANOTHER" });
    assert.equal(failed.phase.status, "idle");
  });
});
