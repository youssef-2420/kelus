import assert from "node:assert/strict";
import test from "node:test";
import { createDemoSnapshot } from "../data/demo-seed.ts";
import { buildExamCoveragePlan, examCoverageHeadline } from "../domain/exam-coverage.ts";
import { isExamPassReturnQuery, examPassStorageKey } from "../lib/exam-pass.ts";
import { buildExamWeekIcs, buildExamWeekSheet } from "../lib/study-reminder.ts";

const now = "2026-09-05T12:00:00.000Z";

test("exam coverage packs needing-work concepts across remaining days without duplicates", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const plan = buildExamCoveragePlan({
    concepts: snapshot.concepts,
    relationships: snapshot.relationships,
    events: snapshot.events,
    exam: snapshot.exams[0],
    nowIso: now,
  });
  assert.equal(plan.remainingDays, 9);
  assert.equal(plan.minutesPerDay, 43);
  assert.ok(plan.needCount >= 1);
  assert.equal(plan.seatedCount + plan.uncoveredCount, plan.needCount);
  assert.ok(plan.days.length >= 1 && plan.days.length <= 9);
  const ids = plan.days.flatMap((day) => day.stops.map((stop) => stop.conceptId));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(plan.days.every((day) => day.minutes <= 43));
  assert.match(examCoverageHeadline(plan), /min\/day/);
});

test("a short horizon leaves uncovered topics at this pace", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const plan = buildExamCoveragePlan({
    concepts: snapshot.concepts,
    relationships: snapshot.relationships,
    events: snapshot.events,
    exam: { ...snapshot.exams[0], examDate: "2026-09-06T12:00:00.000Z", availableMinutes: 15 },
    nowIso: now,
  });
  assert.equal(plan.remainingDays, 1);
  assert.ok(plan.days.length <= 1);
  assert.ok(plan.uncoveredCount >= 1);
  assert.match(examCoverageHeadline(plan), /would be left/);
});

test("exam pass return query and storage keys stay owner-scoped", () => {
  assert.equal(isExamPassReturnQuery(new URLSearchParams("pass=1")), true);
  assert.equal(isExamPassReturnQuery(new URLSearchParams("exam_pass=success")), true);
  assert.equal(isExamPassReturnQuery(new URLSearchParams("pass=0")), false);
  assert.match(examPassStorageKey(null), /:guest$/);
  assert.notEqual(examPassStorageKey("user-a"), examPassStorageKey("user-b"));
});

test("exam week calendar and sheet stay inspectable text", () => {
  const ics = buildExamWeekIcs({
    courseName: "Microeconomics",
    examTarget: "Final",
    days: [{
      dateIso: "2026-09-06T12:00:00.000Z",
      minutes: 43,
      stops: [{ name: "Elasticity", minutes: 16 }],
    }],
    nowMs: Date.parse(now),
  });
  const sheet = buildExamWeekSheet({
    courseName: "Microeconomics",
    examTarget: "Final",
    examDateIso: "2026-09-14T12:00:00.000Z",
    headline: "At 43 min/day, all 3 topics fit.",
    days: [{
      dateIso: "2026-09-06T12:00:00.000Z",
      minutes: 43,
      stops: [{ name: "Elasticity", minutes: 16 }],
    }],
    uncoveredNames: ["Game Theory"],
  });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /Elasticity/);
  assert.match(sheet, /Kelus exam week/);
  assert.match(sheet, /Game Theory/);
  assert.match(sheet, /not a grade prediction/i);
});
