import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { abandonSession, loadAminaDemo, startSession } from "../lib/demo-store.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("nine blockers: sample rail, session abandon, questions honesty, trust gating", async () => {
  const [rail, materials, questions, founding, soft, home, footer, pricing, sessionPage, today, map] = await Promise.all([
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
    source("app/map/page.tsx"),
  ]);

  assert.match(rail, /Sample course model ready|materialsReady/);
  assert.match(materials, /Sample course model is loaded|Sample model ready/);
  assert.match(questions, /body\.success === false/);
  assert.match(founding, /authConfigured/);
  assert.match(soft, /authConfigured/);
  assert.match(home, /Try sample \(~1 min\)/);
  assert.match(home, /Set my exam/);
  assert.doesNotMatch(home, /folio-chapter|Honest methodology/);
  assert.match(footer, /\/pricing/);
  assert.doesNotMatch(home, /Sign in to sync across devices, or get Exam Pass/);
  assert.match(pricing, /authConfigured/);
  assert.match(sessionPage, /abandon\(session\.id\)/);
  assert.match(today, /Resume session|openSession/);
  assert.match(map, /Try sample \(~1 min\)|Try a sample course/);
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
