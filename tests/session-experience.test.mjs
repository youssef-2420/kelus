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
    assert.deepEqual(activity.sourceReferences, []);
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
  assert.match(page, /setPhase\("reroute"\)/);
});

test("materials support learning-purpose labels without claiming analysis", async () => {
  assert.deepEqual(MATERIAL_ROLES.map((item) => item.value), ["syllabus", "lecture_slides", "notes", "past_exam", "course_outline", "other"]);
  assert.equal(materialRoleLabel("past_exam"), "Past exam");
  const library = await source("components/MaterialLibrary.tsx");
  assert.match(library, /This source is/);
  assert.match(library, /confirm every proposed concept/);
  assert.match(library, /Build my Knowledge Map/);
  assert.match(library, /proposeConceptsFromPages/);
});

test("sessions expose a confirmed course source and its page", async () => {
  const page = await source("app/session/page.tsx");
  assert.match(page, /activity\.sourceReferences\.length/);
  assert.match(page, /From your course/);
  assert.match(page, /openSource/);
  assert.match(page, /#page=/);
  assert.match(page, /session-source-panel/);
  assert.match(page, /<iframe/);
  assert.match(page, /Add the PDF again/);
  assert.doesNotMatch(page, /window\.open\(`\$\{URL\.createObjectURL/);
});

test("today exposes confidence while reroutes explain the evidence that changed", async () => {
  const today = await source("components/TodayRoute.tsx");
  const store = await source("lib/demo-store.ts");
  assert.match(today, /confidenceLabel/);
  assert.match(today, /Inside these \{allocation\.minutes\} minutes/);
  assert.match(today, /Learn/);
  assert.match(today, /Retrieve/);
  assert.match(today, /Apply/);
  assert.match(today, /Evaluate and reroute/);
  assert.match(store, /answer on \$\{concept\.name\} changed its mastery estimate/);
  assert.match(store, /higher learning value for the remaining time/);
});
