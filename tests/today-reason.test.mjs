import assert from "node:assert/strict";
import test from "node:test";
import { describeRouteChoice, describeRoutePayoff } from "../lib/today-reason.ts";

test("a first attempt is described as missing evidence, not low ability", () => {
  const explanation = describeRouteChoice(
    { reasons: ["LOW_CONFIDENCE_ESTIMATE", "HIGH_EXAM_VALUE"] },
    { retrievalAttempts: 0 },
  );
  assert.deepEqual(explanation, [
    "You have not checked your recall on this topic in Kelus yet.",
    "Your current course model gives this topic higher exam weight.",
  ]);
});

test("earlier weak answers and prerequisite value explain the choice", () => {
  const explanation = describeRouteChoice(
    { reasons: ["LOW_MASTERY", "PREREQUISITE_GAP"] },
    { retrievalAttempts: 3 },
  );
  assert.deepEqual(explanation, [
    "Your earlier answers suggest this topic needs another pass.",
    "A stronger grasp here may help with connected topics later.",
  ]);
});

test("mixed recall and untagged choices avoid invented precision", () => {
  assert.match(describeRouteChoice({ reasons: [] })[0], /mixed-recall/);
  assert.deepEqual(
    describeRouteChoice({ reasons: [] }, { retrievalAttempts: 2 }),
    ["Selected from your current course and study history."],
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
