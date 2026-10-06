import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyStudyIcs } from "../lib/study-reminder.ts";

const now = new Date(2026, 9, 10, 15, 0).getTime(); // 10 Oct 2026, 15:00 local
const base = { courseName: "Cell Biology", minutes: 30, time: "18:00", examDate: "2026-10-20", nowMs: now };
const lines = (ics) => ics.split("\r\n");

test("a daily block repeats until the exam day, with an alert at the start time", () => {
  const ics = buildDailyStudyIcs(base);
  assert.match(ics, /DTSTART:20261010T180000/);
  assert.match(ics, /DTEND:20261010T183000/);
  assert.match(ics, /RRULE:FREQ=DAILY;UNTIL=20261020T235900/);
  assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY[\s\S]*TRIGGER:PT0S\r\nEND:VALARM/);
  assert.match(ics, /SUMMARY:Kelus · Cell Biology/);
});

test("times are floating (no Z, no zone), so the block stays at the same clock time", () => {
  const ics = buildDailyStudyIcs(base);
  assert.doesNotMatch(lines(ics).find((line) => line.startsWith("DTSTART")), /Z$|TZID/);
  assert.doesNotMatch(lines(ics).find((line) => line.startsWith("RRULE")), /Z$/);
});

test("a time already past today starts tomorrow", () => {
  assert.match(buildDailyStudyIcs({ ...base, time: "07:30" }), /DTSTART:20261011T073000/);
});

test("adding it twice replaces it: the id is stable per course and exam", () => {
  const a = lines(buildDailyStudyIcs(base)).find((line) => line.startsWith("UID"));
  const b = lines(buildDailyStudyIcs({ ...base, time: "20:00" })).find((line) => line.startsWith("UID"));
  assert.equal(a, b);
  assert.match(a, /^UID:kelus-daily-cell-biology-2026-10-20@kelus\.me$/);
});

test("an exam that has passed gives a single block, not an endless repeat", () => {
  assert.doesNotMatch(buildDailyStudyIcs({ ...base, examDate: "2026-10-01" }), /RRULE/);
  assert.doesNotMatch(buildDailyStudyIcs({ ...base, examDate: "" }), /RRULE/);
});

test("names with commas and semicolons are escaped and a short block is at least 15 minutes", () => {
  const ics = buildDailyStudyIcs({ ...base, courseName: "Bio; Chem, Lab", minutes: 5 });
  assert.match(ics, /SUMMARY:Kelus · Bio\; Chem\\, Lab/);
  assert.match(ics, /DTEND:20261010T181500/);
});
