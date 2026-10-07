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
