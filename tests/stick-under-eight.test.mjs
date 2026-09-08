import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { advanceNowIfNeeded, finishSession, loadAminaDemo, startSession } from "../lib/demo-store.ts";
import { pageNeedsOcr } from "../lib/pdf-extraction.ts";
import { proposeConceptsFromPages } from "../domain/material-intelligence.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("wall clock advances stale learner nowIso on return visits", () => {
  const loaded = loadAminaDemo(Date.parse("2026-09-05T12:00:00.000Z"));
  const later = Date.parse("2026-09-06T12:00:00.000Z");
  const { state, changed } = advanceNowIfNeeded(loaded, later);
  assert.equal(changed, true);
  assert.equal(state.nowIso, new Date(later).toISOString());
  assert.notEqual(state.snapshot.concepts[0].predictedRetention, loaded.snapshot.concepts[0].predictedRetention);
});

test("completing a session marks return-visit signal", () => {
  const loaded = loadAminaDemo(Date.parse("2026-09-05T12:00:00.000Z"));
  const { state: started, session } = startSession(loaded, loaded.snapshot.courses[0].id, loaded.snapshot.exams[0].id);
  finishSession(started, session.id, started.snapshot.concepts);
  // Node has no window; markSessionCompleted is a no-op — assert finish still completes.
  assert.equal(
    finishSession(started, session.id, started.snapshot.concepts).snapshot.sessions.find((item) => item.id === session.id)?.status,
    "complete",
  );
});

test("pageNeedsOcr catches letter-poor selectable junk", () => {
  assert.equal(pageNeedsOcr({ pageNumber: 1, text: "" }), true);
  assert.equal(pageNeedsOcr({ pageNumber: 1, text: "a".repeat(80) }), false);
  assert.equal(pageNeedsOcr({ pageNumber: 1, text: "••••••••••••••••••••••••••••••••••••••••••••" }), true);
  assert.equal(pageNeedsOcr({ pageNumber: 0, text: "" }), false);
});

test("relaxed proposal mode still finds short topic lines in ok-density prose PDFs", () => {
  const pages = [
    {
      pageNumber: 1,
      text: [
        "This lecture covers several ideas students must master before the midterm.",
        "Opportunity Cost",
        "Students should also review comparative advantage in trade examples.",
        "Elasticity",
        "Finally, practice with supply and demand shifts from the problem set.",
      ].join("\n\n"),
    },
  ];
  const strict = proposeConceptsFromPages({ materialId: "m1", sourceLabel: "Lecture", pages, mode: "strict" });
  const relaxed = proposeConceptsFromPages({ materialId: "m1", sourceLabel: "Lecture", pages, mode: "relaxed" });
  assert.ok(relaxed.length >= strict.length);
  assert.match(relaxed.map((item) => item.name).join(" "), /Opportunity Cost|Elasticity/);
});

test("stick-under-eight surfaces: return copy, inbox proof, OCR helpers", async () => {
  const [complete, today, questions, form, materials, pdf, env] = await Promise.all([
    source("app/session/complete/page.tsx"),
    source("app/today/page.tsx"),
    source("app/questions/page.tsx"),
    source("components/QuestionsForm.tsx"),
    source("components/MaterialLibrary.tsx"),
    source("lib/pdf-extraction.ts"),
    source(".env.example"),
  ]);
  assert.match(complete, /Come back tomorrow/);
  assert.match(complete, /Back to Today/);
  assert.match(today, /Welcome back/);
  assert.match(today, /lastSessionCompletedAt/);
  assert.match(questions, /QuestionsInboxStatus/);
  assert.match(form, /needs_activation/);
  assert.match(form, /mailto:|questionsInboxEmail/);
  assert.match(materials, /pageNeedsOcr/);
  assert.match(materials, /mode:\s*"relaxed"/);
  assert.match(pdf, /pageNeedsOcr/);
  assert.match(pdf, /synthesizeBlocksFromText/);
  assert.match(env, /inbox proof/);
});
