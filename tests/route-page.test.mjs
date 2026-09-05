import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage presents the V1 product loop after the student hero", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const story = readFileSync("components/home/HomeAfterHero.tsx", "utf8");
  assert.match(page, /HomeHeader/);
  assert.match(page, /KelusHero/);
  assert.match(page, /HomeAfterHero/);
  assert.doesNotMatch(page, /KnowledgeRouteStory/);
  assert.doesNotMatch(page, /<RouteStory/);
  assert.match(story, /TodayPlanIllustration/);
  assert.match(story, /RerouteIllustration/);
  assert.match(story, /MaterialShelfIllustration/);
  assert.match(story, /Honest methodology/);
  assert.match(story, /does not analyze their contents yet/);
});

test("route explainer lives on its own page", () => {
  const page = readFileSync("app/route/page.tsx", "utf8");
  const story = readFileSync("components/home/RouteStory.tsx", "utf8");
  assert.match(page, /RouteStory/);
  assert.match(story, /Your learning/);
  assert.match(story, /TimeClaim/);
  assert.match(story, /RouteLeverage/);
});
