import assert from "node:assert/strict";
import test from "node:test";
import { describeRouteChoice, describeRoutePayoff } from "../lib/today-reason.ts";

test("a first attempt is described as missing evidence, not low ability", () => {
  const explanation = describeRouteChoice(
    { reasons: ["LOW_CONFIDENCE_ESTIMATE", "HIGH_EXAM_VALUE"] },
    { retrievalAttempts: 0 },
  );
  assert.deepEqual(explanation, [
    "New to you here: no answers on it yet.",
    "It carries more weight in your exam.",
  ]);
});

test("earlier weak answers and prerequisite value explain the choice", () => {
  const explanation = describeRouteChoice(
    { reasons: ["LOW_MASTERY", "PREREQUISITE_GAP"] },
    { retrievalAttempts: 3 },
  );
  assert.deepEqual(explanation, [
    "Your last answers here were shaky.",
    "It helps with the topics that build on it.",
  ]);
});

test("mixed recall and untagged choices avoid invented precision", () => {
  assert.match(describeRouteChoice({ reasons: [] })[0], /mixed-recall/);
  assert.deepEqual(
    describeRouteChoice({ reasons: [] }, { retrievalAttempts: 2 }),
    ["Next in your plan."],
  );
});

test("route choice includes a useful student-facing payoff", () => {
  assert.match(
    describeRoutePayoff({ reasons: ["PREREQUISITE_GAP"] }, "Supply & Demand"),
    /make Supply & Demand easier/,
  );
  assert.match(
    describeRoutePayoff({ reasons: ["HIGH_EXAM_VALUE"] }),
    /high-value exam topic/,
  );
});
