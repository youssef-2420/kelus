import assert from "node:assert/strict";
import test from "node:test";
import { returnVisit, warmupChecks } from "../domain/return-visit.ts";

const names = new Map([["o", "Osmosis"], ["e", "Enzymes"], ["a", "Active transport"]]);
const lines = [
  { conceptId: "o", name: "Osmosis", quote: "In a hypertonic solution the cell loses water and becomes plasmolysed.", at: "2026-10-06T10:00:00Z" },
  { conceptId: "o", name: "Osmosis", quote: "Animal cells have no cell wall, so in a hypotonic solution they may burst.", at: "2026-10-06T10:01:00Z" },
  { conceptId: "e", name: "Enzymes", quote: "High temperatures denature an enzyme because the active site changes shape.", at: "2026-10-06T10:05:00Z" },
];
const events = [{ kind: "retrieval", conceptId: "o", createdAt: "2026-10-06T10:00:00Z", outcome: "partial" }];

test("a later visit is a return: it knows how long you were away and what you did last", () => {
  const visit = returnVisit({ events, names, missed: lines, nowMs: Date.parse("2026-10-08T09:00:00Z") });
  assert.equal(visit.returning, true);
  assert.equal(visit.daysAway, 2);
  assert.equal(visit.lastName, "Osmosis");
  assert.equal(visit.lastOutcome, "partial");
  assert.deepEqual(visit.lastDayNames, ["Osmosis"]);
});

test("the warm-up spreads across topics first and never repeats a line", () => {
  const visit = returnVisit({ events, names, missed: lines, nowMs: Date.parse("2026-10-08T09:00:00Z") });
  assert.equal(visit.warmup.length, 3);
  assert.notEqual(visit.warmup[0].conceptId, visit.warmup[1].conceptId, "one per topic before a second from the same topic");
  assert.equal(new Set(visit.warmup.map((line) => line.quote)).size, 3);
});

test("staying in the same sitting is not a return, and fresh misses wait", () => {
  const visit = returnVisit({ events, names, missed: lines, nowMs: Date.parse("2026-10-06T10:30:00Z") });
  assert.equal(visit.returning, false);
  assert.deepEqual(visit.warmup, []);
});

test("lines of removed topics never come back, and no answers means no return", () => {
  const visit = returnVisit({ events, names: new Map([["o", "Osmosis"]]), missed: lines, nowMs: Date.parse("2026-10-08T09:00:00Z") });
  assert.ok(visit.warmup.every((line) => line.conceptId === "o"));
  assert.equal(returnVisit({ events: [], names, missed: lines, nowMs: Date.parse("2026-10-08T09:00:00Z") }).returning, false);
});

test("each warm-up check is built from the missed sentence itself and quotes it exactly", () => {
  const checks = warmupChecks(lines);
  assert.equal(checks.length, 3);
  for (const { line, item } of checks) {
    assert.equal(item.sourceQuote, line.quote);
    assert.ok(item.kind === "cloze" || item.kind === "choice");
  }
});

test("straight after a block, the next topic is one you have not just answered, even if the plan only held those", async () => {
  const { restAware } = await import("../lib/today-focus.ts");
  const now = "2026-10-06T12:00:00.000Z";
  const events = ["a", "b"].map((conceptId) => ({ kind: "retrieval", conceptId, createdAt: "2026-10-06T11:30:00.000Z" }));
  const concepts = [{ id: "a", retrievalAttempts: 1, examImportance: 0.3 }, { id: "b", retrievalAttempts: 1, examImportance: 0.3 }, { id: "c", retrievalAttempts: 0, examImportance: 0.2 }, { id: "d", retrievalAttempts: 0, examImportance: 0.5 }];
  const plan = [{ conceptId: "a", minutes: 9 }, { conceptId: "b", minutes: 8 }, { conceptId: "mixed-retrieval", minutes: 5 }];
  assert.equal(restAware(plan, events, now, concepts)[0].conceptId, "d", "an untouched topic, most exam weight first");
  assert.equal(restAware([{ conceptId: "c", minutes: 8 }, ...plan], events, now, concepts)[0].conceptId, "c", "a fresh planned topic stays first");
  assert.equal(restAware(plan, events, "2026-10-06T18:00:00.000Z", concepts)[0].conceptId, "a", "after a rest, the plan is the plan");
});
