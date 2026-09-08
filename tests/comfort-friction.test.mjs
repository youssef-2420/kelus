import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildTomorrowStudyIcs } from "../lib/study-reminder.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("tomorrow study ICS is a valid one-event calendar file", () => {
  const ics = buildTomorrowStudyIcs({
    courseName: "Molecular Biology",
    minutes: 45,
    nextStopName: "Transcription",
    todayUrl: "https://kelus.me/today/",
    nowMs: Date.parse("2026-09-08T12:00:00.000Z"),
  });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:Kelus · Molecular Biology/);
  assert.match(ics, /Transcription/);
  assert.match(ics, /kelus\.me\/today/);
});

test("comfort friction: one-step setup, skip recall, faster PDF, calendar, mailto", async () => {
  const [setup, diagnosis, materials, pdf, complete, form, questions] = await Promise.all([
    source("components/FirstRunSetup.tsx"),
    source("components/InitialDiagnosis.tsx"),
    source("components/MaterialLibrary.tsx"),
    source("lib/pdf-extraction.ts"),
    source("app/session/complete/page.tsx"),
    source("components/QuestionsForm.tsx"),
    source("app/questions/page.tsx"),
  ]);
  assert.doesNotMatch(setup, /step === 1|Step<\/span>/);
  assert.match(setup, /one step/);
  assert.match(setup, /Continue with my course/);
  assert.match(diagnosis, /Skip recall/);
  assert.match(materials, /maxContentPages:\s*16/);
  assert.match(materials, /stopAfterRecoveredPages:\s*4/);
  assert.match(pdf, /maxContentPages/);
  assert.match(pdf, /stopAfterRecoveredPages/);
  assert.match(complete, /Add tomorrow to calendar/);
  assert.match(complete, /downloadTomorrowStudyIcs/);
  assert.match(form, /mailto:/);
  assert.match(form, /Email hello@kelus\.me/);
  assert.match(form, /Send in browser/);
  assert.match(questions, /QuestionsInboxStatus/);
});
