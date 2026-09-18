import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDemoLearningActivities } from "../data/demo-learning-activities.ts";
import { createDemoSnapshot } from "../data/demo-seed.ts";
import { MATERIAL_ROLES, materialRoleLabel } from "../domain/materials.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("every demo concept has a deterministic learn, retrieve and apply activity", () => {
  const snapshot = createDemoSnapshot(Date.parse("2026-09-05T12:00:00.000Z"));
  const activities = createDemoLearningActivities();
  assert.equal(activities.length, snapshot.concepts.length);
  for (const concept of snapshot.concepts) {
    const activity = activities.find((item) => item.conceptId === concept.id);
    assert.ok(activity, `missing activity for ${concept.id}`);
    assert.ok(activity.learn.explanation.length > 40);
    assert.ok(activity.retrieve.prompt.length > 10);
    assert.ok(activity.retrieve.hint.length > 10);
    assert.ok(activity.apply.prompt.length > 10);
    assert.ok(activity.apply.modelAnswer.length > 10);
    assert.deepEqual(activity.sourceReferences, [
      {
        materialId: "demo-syllabus-microeconomics",
        label: "Sample syllabus",
        locator: null,
      },
    ]);
  }
});

test("the session executes learn, retrieve, apply and evaluate before updating the route", async () => {
  const page = await source("app/session/page.tsx");
  const order = [
    'phase === "learn"',
    'phase === "retrieve"',
    'phase === "apply"',
    'phase === "evaluate"',
  ].map((marker) => page.indexOf(marker));
  assert.ok(order.every((position) => position >= 0));
  assert.ok(order.every((position, index) => index === 0 || position > order[index - 1]));
  assert.match(page, /Hint/);
  assert.match(page, /Explain this/);
  assert.match(page, /Show an example/);
  assert.match(page, /submit\(\{/);
  assert.match(page, /evaluateLearningResponse/);
  assert.doesNotMatch(page, />I can use it</);
  assert.match(page, /setPhase\("reroute"\)/);
});

test("materials support learning-purpose labels without claiming analysis", async () => {
  assert.deepEqual(MATERIAL_ROLES.map((item) => item.value), ["syllabus", "lecture_slides", "notes", "past_exam", "course_outline", "other"]);
  assert.equal(materialRoleLabel("past_exam"), "Past exam");
  const library = await source("components/MaterialLibrary.tsx");
  assert.match(library, /This source is/);
  assert.match(library, /review every\s+suggested topic/);
  assert.match(library, /Confirm topics|Build my topic map|Build my Knowledge Map/);
  assert.match(library, /proposeConceptsFromPages/);
});

test("sessions expose a confirmed course source and its page", async () => {
  const page = await source("app/session/page.tsx");
  assert.match(page, /activity\.sourceReferences\.length/);
  assert.match(page, /Source/);
  assert.match(page, /openSource/);
  assert.match(page, /#page=/);
  assert.match(page, /session-source-panel/);
  assert.match(page, /<iframe/);
  assert.match(page, /Add the PDF again/);
  assert.doesNotMatch(page, /window\.open\(`\$\{URL\.createObjectURL/);
});

test("today is one booklet page — topic title and start only", async () => {
  const today = await source("components/TodayRoute.tsx");
  const page = await source("app/today/page.tsx");
  const surface = await source("components/RevisionSurface.tsx");
  const store = await source("lib/demo-store.ts");
  assert.match(today, /is-booklet-page/);
  assert.match(today, /id="today-title"/);
  assert.match(today, /today-page-folio/);
  assert.match(today, /startLabel \?\? `Start \$\{firstName\}`|Start \{firstName\}/);
  assert.doesNotMatch(today, /Next stops|today-plan-list|Why this|confidenceLabel|From your course/);
  assert.match(surface, /is-booklet-page/);
  assert.match(surface, /mode !== "today"/);
  assert.doesNotMatch(`${page}\n${surface}`, /RouteKnowledgeMap/);
  assert.doesNotMatch(surface, /<MasteryEvidence/);
  assert.match(store, /answer on \$\{concept\.name\} changed its mastery estimate/);
  assert.match(store, /higher learning value for the remaining time/);
});
