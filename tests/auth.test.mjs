import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("the shared header uses the real authentication provider", async () => {
  const [header, layout] = await Promise.all([
    source("components/SiteHeader.tsx"),
    source("app/layout.tsx"),
  ]);
  assert.match(layout, /<AuthProvider>/);
  assert.match(header, /auth\.openDialog/);
  assert.match(header, /auth\.signOut/);
  assert.match(header, /Sign in/);
});

test("Supabase sessions persist and auth supports password, signup and Google", async () => {
  const [client, provider] = await Promise.all([
    source("lib/supabase-client.ts"),
    source("components/AuthProvider.tsx"),
  ]);
  assert.match(client, /persistSession: true/);
  assert.match(client, /autoRefreshToken: true/);
  assert.match(client, /detectSessionInUrl: true/);
  assert.match(provider, /signInWithPassword/);
  assert.match(provider, /auth\.signUp/);
  assert.match(provider, /provider: "google"/);
});

test("production injects only public Supabase credentials into the static build", async () => {
  const workflow = await source(".github/workflows/restore-kelus-dns.yml");
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(workflow, /SERVICE_ROLE/);
});
