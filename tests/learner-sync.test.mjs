import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDemoSnapshot } from "../data/demo-seed.ts";
import { initialDemoState, stateForAuthenticatedUser } from "../lib/demo-store.ts";

test("claiming a guest learner state replaces every ownership field", () => {
  const state = initialDemoState(Date.parse("2026-09-05T12:00:00.000Z"));
  const claimed = stateForAuthenticatedUser(state, "auth-user-1");
  assert.equal(claimed.snapshot.profile.id, "auth-user-1");
  assert.ok(claimed.snapshot.courses.every((item) => item.userId === "auth-user-1"));
  assert.ok(claimed.snapshot.exams.every((item) => item.userId === "auth-user-1"));
  assert.ok(claimed.snapshot.concepts.every((item) => item.userId === "auth-user-1"));
  assert.ok(claimed.snapshot.events.every((item) => item.userId === "auth-user-1"));
});

test("learner state migration enables RLS and scopes every policy to auth uid", async () => {
  const sql = await readFile(new URL("../database/003_user_learning_state.sql", import.meta.url), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.equal((sql.match(/auth\.uid\(\) = user_id/g) ?? []).length, 5);
  assert.doesNotMatch(sql, /using \(true\)|with check \(true\)/i);
});

test("demo snapshot remains serializable for the document state adapter", () => {
  const snapshot = createDemoSnapshot(Date.parse("2026-09-05T12:00:00.000Z"));
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
});
