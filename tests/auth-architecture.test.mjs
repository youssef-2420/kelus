import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Supabase browser auth uses only public configuration", async () => {
  const [client, env, dialog] = await Promise.all([read("lib/supabase/client.ts"), read(".env.example"), read("components/SignInDialog.tsx")]);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(env, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(env, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
  assert.doesNotMatch(client + dialog, /SERVICE_ROLE|service_role/);
  assert.match(dialog, /signInWithPassword/);
  assert.match(dialog, /signUp/);
  assert.match(dialog, /data: \{ full_name: name \}/);
  assert.match(dialog, /autoComplete="name"/);
  assert.match(dialog, /signInWithOAuth/);
  assert.match(dialog, /socialSignIn\("google"\)/);
  assert.match(dialog, /socialSignIn\("apple"\)/);
  assert.match(dialog, /resetPasswordForEmail/);
  assert.match(dialog, /signOut/);
});

test("alert ownership is enforced by RLS for every operation", async () => {
  const sql = await read("supabase/migrations/202608250001_create_price_alerts.sql");
  assert.match(sql, /enable row level security/i);
  for (const operation of ["select", "insert", "update", "delete"]) assert.match(sql, new RegExp(`for ${operation} to authenticated`, "i"));
  assert.equal((sql.match(/auth\.uid\(\)/g) ?? []).length >= 5, true);
  assert.match(sql, /primary key \(user_id, id\)/i);
});

test("background alert events are server-written and user-readable only", async () => {
  const sql = await read("supabase/migrations/202608250002_price_alert_monitoring.sql");
  assert.match(sql, /price_alert_events/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /grant select on table public\.price_alert_events to authenticated/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*price_alert_events.*authenticated/i);
  assert.match(sql, /auth\.uid\(\).*user_id/is);
  assert.match(sql, /cron\.schedule/i);
  assert.match(sql, /vault\.decrypted_secrets/i);
});

test("local alerts are deleted only after authenticated migration succeeds", async () => {
  const service = await read("services/user-alerts.ts");
  const upsert = service.indexOf("await upsertUserAlerts(user.id, local)");
  const remove = service.indexOf("window.localStorage.removeItem(PRICE_ALERTS_KEY)");
  assert.ok(upsert >= 0 && remove > upsert);
  assert.match(service, /data\.user\.id !== expectedUserId/);
});
