import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "app/page.tsx",
  "components/home/RouteStory.tsx",
  "components/home/HomeAfterHero.tsx",
  "components/home/LeverageBoard.tsx",
  "components/home/TimeClaim.tsx",
  "app/today/page.tsx",
];

const banned = [
  "Learning navigation",
  "One plan, three signals",
  "Find the leverage",
  "Fit the time you have",
  "Let the plan move",
  "What Kelus will not do",
  "Today’s route",
  "Today's route",
  "Highest learning value first",
  "Overview",
  "Today’s tasks",
  "Knowledge map",
];

test("homepage and today do not use stacked marketing section labels", () => {
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  for (const phrase of banned) {
    assert.equal(source.includes(phrase), false, `unexpected label: ${phrase}`);
  }
});

test("homepage is a single route story with the landscape headline", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const story = readFileSync("components/home/RouteStory.tsx", "utf8");
  assert.match(page, /RouteStory/);
  assert.doesNotMatch(page, /KelusHero/);
  assert.match(story, /Your learning/);
  assert.match(story, /Build my route/);
  assert.match(story, /KnowledgeLandscape/);
  assert.match(story, /TimeClaim/);
  assert.match(story, /LeverageBoard/);
});

test("today uses spatial scale instead of dashboard headings", () => {
  const today = readFileSync("app/today/page.tsx", "utf8");
  assert.match(today, /today-days/);
  assert.match(today, /today-minutes-hero/);
  assert.match(today, /Start route/);
  assert.match(readFileSync("components/RouteKnowledgeMap.tsx", "utf8"), /route-map-ready/);
});
