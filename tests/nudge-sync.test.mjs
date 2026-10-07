import assert from "node:assert/strict";
import test from "node:test";
import { nudgeDue, readyCount } from "../lib/nudge.ts";
import { mergeMissedLines } from "../lib/demo-store.ts";

const HOUR = 60 * 60 * 1000;
const at = (iso) => Date.parse(iso);
const base = { on: true, time: "18:00", lines: [at("2026-10-07T09:00:00"), at("2026-10-08T17:00:00")], lastAnswerAt: "2026-10-07T09:00:00" };

test("a line is ready once it has rested four hours", () => {
  assert.equal(readyCount(base.lines, at("2026-10-08T18:30:00")), 1);
  assert.equal(readyCount(base.lines, at("2026-10-08T21:30:00")), 2);
});

test("the nudge comes once a day, after your time, only with lines ready and only if you have not studied today", () => {
  assert.equal(nudgeDue(base, new Date("2026-10-08T18:30:00"), null).due, true);
  assert.equal(nudgeDue(base, new Date("2026-10-08T17:30:00"), null).due, false, "before your time");
  assert.equal(nudgeDue(base, new Date("2026-10-08T18:30:00"), "2026-10-08").due, false, "already shown today");
  assert.equal(nudgeDue({ ...base, lastAnswerAt: "2026-10-08T08:00:00" }, new Date("2026-10-08T18:30:00"), null).due, false, "already studied today");
  assert.equal(nudgeDue({ ...base, lines: [at("2026-10-08T16:00:00")] }, new Date("2026-10-08T18:30:00"), null).due, false, "nothing has rested yet");
  assert.equal(nudgeDue({ ...base, on: false }, new Date("2026-10-08T18:30:00"), null).due, false, "off means off");
});

test("missed lines from two devices meet without duplicates, newest copy kept", () => {
  const a = [{ conceptId: "o", name: "Osmosis", quote: "Line one.", at: "2026-10-06T10:00:00Z" }];
  const b = [{ conceptId: "o", name: "Osmosis", quote: "Line one.", at: "2026-10-07T10:00:00Z" }, { conceptId: "e", name: "Enzymes", quote: "Line two.", at: "2026-10-05T10:00:00Z" }];
  const merged = mergeMissedLines(a, b);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((line) => line.quote === "Line one.").at, "2026-10-07T10:00:00Z");
  assert.equal(merged[0].quote, "Line two.", "oldest first, newest last");
  assert.deepEqual(mergeMissedLines(undefined, undefined), []);
});
