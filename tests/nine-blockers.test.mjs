import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { abandonSession, loadAminaDemo, startSession } from "../lib/demo-store.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("nine blockers: sample rail, session abandon, questions honesty, trust gating", async () => {
  const [rail, materials, questions, founding, soft, home, footer, pricing, sessionPage, today, surface, map] = await Promise.all([
    source("components/CourseWorkspaceRail.tsx"),
    source("components/MaterialLibrary.tsx"),
    source("lib/questions.ts"),
    source("components/FoundingCta.tsx"),
    source("components/SoftUpgradePrompt.tsx"),
    source("components/home/HomeAfterHero.tsx"),
    source("components/SiteFooter.tsx"),
    source("app/pricing/page.tsx"),
    source("app/session/page.tsx"),
    source("app/today/page.tsx"),
    source("components/RevisionSurface.tsx"),
    source("app/map/page.tsx"),
  ]);

  assert.match(rail, /Add a source to build your course model|materialsReady/);
  assert.match(materials, /Sample model is ready|Sample course model is loaded|Sample model ready/);
  assert.match(questions, /body\.success === false/);
  assert.match(founding, /authConfigured/);
  assert.match(soft, /authConfigured/);
  assert.doesNotMatch(home, /Try sample \(~1 min\)/);
  assert.doesNotMatch(home, /Set my exam/);
  assert.doesNotMatch(home, /folio-chapter|Honest methodology/);
  assert.match(footer, /\/pricing/);
  assert.doesNotMatch(home, /Sign in to sync across devices, or get Exam Pass/);
  assert.match(pricing, /authConfigured/);
  assert.match(sessionPage, /abandon\(session\.id\)/);
  assert.match(`${today}\n${surface}`, /Resume session|openSession/);
  assert.doesNotMatch(map, /Try sample|Try a sample course/);
});

test("abandoning a session clears in_progress without counting as complete", () => {
  const loaded = loadAminaDemo(Date.parse("2026-09-05T12:00:00.000Z"));
  const { state: started, session } = startSession(loaded, loaded.snapshot.courses[0].id, loaded.snapshot.exams[0].id);
  assert.equal(started.snapshot.sessions.filter((item) => item.status === "in_progress").length, 1);
  const abandoned = abandonSession(started, session.id);
  assert.equal(abandoned.snapshot.sessions.find((item) => item.id === session.id)?.status, "abandoned");
  assert.equal(abandoned.snapshot.sessions.some((item) => item.status === "in_progress"), false);
  const again = startSession(abandoned, abandoned.snapshot.courses[0].id, abandoned.snapshot.exams[0].id);
  assert.equal(again.state.snapshot.sessions.filter((item) => item.status === "in_progress").length, 1);
});

test("trust surfaces show a real demo outcome and student-facing support copy", async () => {
  const [demo, questions, status, materials, complete, setup] = await Promise.all([
    source("components/hero/HeroProductDemo.tsx"),
    source("app/questions/page.tsx"),
    source("components/QuestionsInboxStatus.tsx"),
    source("components/MaterialLibrary.tsx"),
    source("app/session/complete/page.tsx"),
    source("components/DropNotes.tsx"),
  ]);

  assert.match(demo, /setRouteOutcome\("again"\)/);
  assert.match(demo, /setRouteOutcome\("remembered"\)/);
  assert.doesNotMatch(status, /Inbox proof/);
  assert.match(status, /Questions are answered by email/);
  assert.match(materials, /proposalConfidence/);
  // The end of a block names each topic with its outcome and says what comes back tomorrow; no before/after essay.
  assert.match(complete, /Topics in this block/);
  assert.match(complete, /back as a 1-minute warm-up/);
  assert.doesNotMatch(complete, /ReadinessShift|The useful change/);
  assert.match(setup, /Your notes stay on this device/);
});
