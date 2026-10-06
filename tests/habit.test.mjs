import assert from "node:assert/strict";
import test from "node:test";
import { habitSummary } from "../domain/habit.ts";

const at = (dayOffset, hour = 12) => new Date(2026, 9, 10 + dayOffset, hour).toISOString();
const now = new Date(2026, 9, 10, 15).getTime();
const concepts = [
  { id: "a", examImportance: 1, nextReviewAt: at(1) },
  { id: "b", examImportance: 1, nextReviewAt: at(3) },
  { id: "c", examImportance: 2, nextReviewAt: null },
  { id: "d", examImportance: 1, nextReviewAt: at(1, 9) },
];
const ev = (day, conceptId, before = 0.2, after = 0.4, kind = "retrieval") => ({ kind, conceptId, createdAt: at(day), masteryBefore: before, masteryAfter: after });

test("studying today starts a streak of one and counts topics, not attempts", () => {
  const s = habitSummary({ events: [ev(0, "a"), ev(0, "a"), ev(0, "b")], concepts, nowMs: now });
  assert.equal(s.streak, 1);
  assert.equal(s.topicsToday, 2);
  assert.equal(s.goal, 3);
  assert.equal(s.goalMet, false);
});

test("a streak survives until the day after the last session ends, then resets", () => {
  const alive = habitSummary({ events: [ev(-1, "a"), ev(-2, "a"), ev(-3, "a")], concepts, nowMs: now });
  assert.equal(alive.streak, 3);
  assert.equal(alive.studiedToday, false);
  const broken = habitSummary({ events: [ev(-2, "a"), ev(-3, "a")], concepts, nowMs: now });
  assert.equal(broken.streak, 0);
});

test("opening the app or rating alone never counts as studying", () => {
  const s = habitSummary({ events: [ev(0, "a", 0, 0, "seed_rating"), ev(0, "a", 0, 0, "hint_used")], concepts, nowMs: now });
  assert.equal(s.streak, 0);
  assert.equal(s.studiedToday, false);
});

test("the week has seven days ending today, with studied days marked", () => {
  const s = habitSummary({ events: [ev(0, "a"), ev(-2, "b")], concepts, nowMs: now });
  assert.equal(s.week.length, 7);
  assert.equal(s.week[6].today, true);
  assert.deepEqual(s.week.map((d) => d.studied), [false, false, false, false, true, false, true]);
});

test("the goal is three topics, fewer for a small course, and can be met", () => {
  const met = habitSummary({ events: [ev(0, "a"), ev(0, "b"), ev(0, "c")], concepts, nowMs: now });
  assert.equal(met.goalMet, true);
  const small = habitSummary({ events: [ev(0, "a")], concepts: concepts.slice(0, 1), nowMs: now });
  assert.equal(small.goal, 1);
  assert.equal(small.goalMet, true);
});

test("points this week are importance-weighted gains and never negative; old gains drop out", () => {
  const s = habitSummary({ events: [ev(0, "c", 0.2, 0.6), ev(-10, "a", 0, 1)], concepts, nowMs: now });
  assert.equal(s.pointsThisWeek, 16);
  const worse = habitSummary({ events: [ev(0, "a", 0.6, 0.2)], concepts, nowMs: now });
  assert.equal(worse.pointsThisWeek, 0);
});

test("topics coming back tomorrow are counted by calendar day", () => {
  assert.equal(habitSummary({ events: [], concepts, nowMs: now }).backTomorrow, 2);
});
