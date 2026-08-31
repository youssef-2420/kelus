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
  assert.match(dialog, /provider: "google"/);
  assert.doesNotMatch(dialog, /provider: "apple"|Continue with Apple/);
  assert.match(dialog, /resetPasswordForEmail/);
  assert.match(dialog, /signOut/);
  assert.doesNotMatch(dialog, /Checking account/);
});

test("authentication dialog stays within desktop and mobile viewports", async () => {
  const styles = await read("app/globals.css");
  const dialog = await read("components/SignInDialog.tsx");
  assert.match(styles, /\.modal-backdrop \{[^}]*overflow:auto/);
  assert.match(styles, /\.auth-sheet \{[^}]*min-height:100dvh/);
  assert.match(styles, /\.auth-sheet:before,\.auth-sheet:after \{[^}]*flex:1 0 12px/);
  assert.match(styles, /\.signin-dialog \{[^}]*width:min\(400px,100%\)/);
  assert.match(dialog, /className="auth-sheet"/);
  assert.match(styles, /@media\(max-width:620px\)\{[\s\S]*\.signin-dialog\{padding:18px 14px 12px/);
  assert.match(styles, /@media\(max-height:800px\)\{[\s\S]*\.dialog-legal\{font-size:10px;line-height:1\.35;margin-top:6px\}/);
  assert.doesNotMatch(styles, /\.dialog-legal\{display:none\}/);
  assert.doesNotMatch(styles, /place-items:center; overflow:auto; padding:92px/);
  assert.doesNotMatch(styles, /padding:52px 62px 28px/);
  assert.doesNotMatch(styles, /\.modal-backdrop\{display:flex;align-items:center;justify-content:center;padding:22px\}/);
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

test("background monitor runs are auditable without exposing operations to browser roles", async () => {
  const [sql, monitor] = await Promise.all([
    read("supabase/migrations/202608260001_alert_monitor_runs.sql"),
    read("services/server-alert-monitor.ts"),
  ]);
  assert.match(sql, /price_alert_monitor_runs/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.price_alert_monitor_runs from anon, authenticated/i);
  assert.doesNotMatch(sql, /grant .*price_alert_monitor_runs.*authenticated/i);
  assert.match(monitor, /run_complete/);
  assert.match(monitor, /run_failed/);
  assert.match(monitor, /crypto\.randomUUID\(\)/);
});

test("price-alert email status is server-written, user-readable, and claimed atomically", async () => {
  const sql = await read("supabase/migrations/202608260002_price_alert_email_notifications.sql");
  assert.match(sql, /price_alert_notifications/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /grant select on table public\.price_alert_notifications to authenticated/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*price_alert_notifications.*authenticated/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /event_key text not null unique/i);
  assert.match(sql, /attempt_count < 5/i);
  assert.match(sql, /grant execute on function public\.claim_price_alert_notifications\(integer\) to service_role/i);
});

test("local alerts are deleted only after authenticated migration succeeds", async () => {
  const service = await read("services/user-alerts.ts");
  const upsert = service.indexOf("await upsertUserAlerts(user.id, local)");
  const remove = service.indexOf("window.localStorage.removeItem(PRICE_ALERTS_KEY)");
  assert.ok(upsert >= 0 && remove > upsert);
  assert.match(service, /data\.session\.user\.id !== expectedUserId/);
});
