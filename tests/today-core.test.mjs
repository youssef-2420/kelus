import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("today does not use dashboard section labels", () => {
  const today = readFileSync("app/today/page.tsx", "utf8");
  for (const phrase of ["Overview", "Your progress", "Recommended for you", "Today’s route", "Highest learning value first", "Knowledge map"]) {
    assert.equal(today.includes(phrase), false, phrase);
  }
  assert.match(today, /Start route/);
  assert.match(today, /today-stat/);
});

test("marketing header is sign-in and start learning", () => {
  const header = readFileSync("components/home/HomeHeader.tsx", "utf8");
  assert.match(header, /Sign in/);
  assert.match(header, /Start learning/);
  assert.doesNotMatch(header, />Today</);
});
