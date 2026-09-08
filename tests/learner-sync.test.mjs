import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDemoSnapshot } from "../data/demo-seed.ts";
import { demoStateStorageKey, initialDemoState, stateForAuthenticatedUser } from "../lib/demo-store.ts";
import { materialFileStorageKey, materialMetadataStorageKey } from "../lib/material-store.ts";

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

test("local learner and material records are isolated by owner, with a separate guest scope", () => {
  assert.notEqual(demoStateStorageKey("user-a"), demoStateStorageKey("user-b"));
  assert.notEqual(materialMetadataStorageKey("user-a"), materialMetadataStorageKey("user-b"));
  assert.notEqual(materialFileStorageKey("material-1", "user-a"), materialFileStorageKey("material-1", "user-b"));
  assert.match(demoStateStorageKey(null), /:guest$/);
  assert.match(materialMetadataStorageKey(null), /:guest$/);
  assert.match(materialFileStorageKey("material-1", null), /^guest:/);
});

test("the learner shell does not render one account while private scopes are switching", async () => {
  const provider = await readFile(new URL("../components/LearnerProvider.tsx", import.meta.url), "utf8");
  assert.match(provider, /getDemoStateOwner\(\) === activeUserId && materialOwner === activeUserId/);
  assert.match(provider, /Loading your private learning route/);
  assert.match(provider, /claimGuestMaterials\(userId\)/);
});
