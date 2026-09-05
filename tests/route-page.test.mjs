import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage keeps the student hero and workbench", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  assert.match(page, /KelusHero/);
  assert.match(page, /KnowledgeRouteStory/);
  assert.match(page, /HomeAfterHero/);
  assert.doesNotMatch(page, /<RouteStory/);
});

test("route explainer lives on its own page", () => {
  const page = readFileSync("app/route/page.tsx", "utf8");
  const story = readFileSync("components/home/RouteStory.tsx", "utf8");
  assert.match(page, /RouteStory/);
  assert.match(story, /Your learning/);
  assert.match(story, /TimeClaim/);
  assert.match(story, /RouteLeverage/);
});
