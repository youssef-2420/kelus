import test from "node:test";
import assert from "node:assert/strict";
import { forecastReadiness } from "../domain/forecast.ts";

function session(id, before, after, endedAt, status = "complete") {
  return { id, status, startedAt: endedAt, endedAt, summary: { readinessBefore: before, readinessAfter: after } };
}

test("no completed session gives no forecast instead of an invented number", () => {
  assert.deepEqual(forecastReadiness({ sessions: [], readiness: 0.5, targetPercent: 85, daysToExam: 9 }), { state: "no-evidence" });
  assert.deepEqual(
    forecastReadiness({ sessions: [session("a", 0.4, 0.5, "2026-10-01", "in_progress")], readiness: 0.5, targetPercent: 85, daysToExam: 9 }),
    { state: "no-evidence" },
  );
});

test("projects from the average gain of recent completed sessions", () => {
  const result = forecastReadiness({
    sessions: [session("a", 0.4, 0.45, "2026-10-01"), session("b", 0.45, 0.53, "2026-10-02")],
    readiness: 0.53,
    targetPercent: 85,
    daysToExam: 4,
  });
  assert.equal(result.state, "projected");
  assert.ok(Math.abs(result.gainPerSession - 0.065) < 1e-9);
  assert.ok(Math.abs(result.projected - (0.53 + 0.065 * 4)) < 1e-9);
  assert.equal(result.sessionsToTarget, 5);
});

test("projection never exceeds 100 percent and a flat trend is reported as flat", () => {
  const capped = forecastReadiness({ sessions: [session("a", 0.5, 0.7, "2026-10-01")], readiness: 0.9, targetPercent: 85, daysToExam: 30 });
  assert.equal(capped.state, "projected");
  assert.equal(capped.projected, 1);
  assert.equal(capped.sessionsToTarget, 0);
  assert.equal(forecastReadiness({ sessions: [session("a", 0.6, 0.55, "2026-10-01")], readiness: 0.55, targetPercent: 85, daysToExam: 9 }).state, "flat");
});
