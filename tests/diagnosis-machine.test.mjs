import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_DIAGNOSIS_STATE,
  allRated,
  canCompare,
  isRevealed,
  reduceDiagnosis,
} from "../lib/diagnosis-machine.ts";

const evaluation = {
  outcome: "partial",
  label: "Partly there",
  explanation: "Some terms matched.",
  criteria: [],
};

describe("diagnosis state machine", () => {
  it("rates only while in rating phase", () => {
    let state = reduceDiagnosis(INITIAL_DIAGNOSIS_STATE, {
      type: "RATE",
      conceptId: "c1",
      rating: "weak",
    });
    assert.equal(state.ratings.c1, "weak");
    assert.equal(allRated(state.ratings, ["c1", "c2"]), false);

    state = reduceDiagnosis(state, {
      type: "BEGIN_CHECKS",
      conceptId: "c1",
      reason: "Highest exam value",
    });
    state = reduceDiagnosis(state, {
      type: "RATE",
      conceptId: "c2",
      rating: "strong",
    });
    assert.equal(state.ratings.c2, undefined);
    assert.equal(state.phase.status, "answering");
  });

  it("blocks compare without an answer and requires evaluation on reveal", () => {
    let state = reduceDiagnosis(INITIAL_DIAGNOSIS_STATE, {
      type: "BEGIN_CHECKS",
      conceptId: "c1",
      reason: "Gap",
    });
    assert.equal(canCompare(state.phase), false);
    state = reduceDiagnosis(state, { type: "COMPARE", evaluation });
    assert.equal(state.phase.status, "answering");

    state = reduceDiagnosis(state, { type: "SET_ANSWER", answer: "osmosis" });
    assert.equal(canCompare(state.phase), true);
    state = reduceDiagnosis(state, { type: "COMPARE", evaluation });
    assert.equal(isRevealed(state.phase), true);
    assert.equal(state.phase.status === "revealed" && state.phase.evaluation.label, "Partly there");
  });

  it("never keeps answering and revealed together across grade next", () => {
    let state = reduceDiagnosis(INITIAL_DIAGNOSIS_STATE, {
      type: "BEGIN_CHECKS",
      conceptId: "c1",
      reason: "First",
    });
    state = reduceDiagnosis(state, { type: "SET_ANSWER", answer: "answer" });
    state = reduceDiagnosis(state, { type: "COMPARE", evaluation });
    state = reduceDiagnosis(state, {
      type: "GRADE_NEXT",
      retrieval: {
        conceptId: "c1",
        promptId: "p1",
        responseText: "answer",
        outcome: "partial",
        responseTimeMs: 1200,
      },
      conceptId: "c2",
      reason: "Next gap",
    });
    assert.equal(state.phase.status, "answering");
    assert.equal(state.retrievals.length, 1);
    assert.equal(state.phase.status === "answering" && state.phase.conceptId, "c2");
    assert.equal(state.phase.status === "answering" && state.phase.answer, "");
  });
});
