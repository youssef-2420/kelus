import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production deploys from main to a Cloudflare Worker with D1 and cron", async () => {
  const [workflow, config, viteConfig, packageJson] = await Promise.all([
    read(".github/workflows/deploy-cloudflare.yml"),
    read("wrangler.jsonc"),
    read("vite.config.ts"),
    read("package.json"),
  ]);

  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /wrangler d1 migrations apply kelus-production --remote/);
  assert.match(workflow, /wrangler deploy --config dist\/server\/wrangler\.json --keep-vars/);
  assert.match(workflow, /validate-cloudflare-env\.mjs/);

  assert.match(config, /"binding": "DB"/);
  assert.match(config, /"binding": "IMAGES"/);
  assert.match(config, /"crons": \["\*\/15 \* \* \* \*"\]/);
  assert.match(viteConfig, /configPath: "\.\/wrangler\.jsonc"/);
  assert.doesNotMatch(viteConfig, /@openai\/sites-vite-plugin/);
  assert.doesNotMatch(packageJson, /@openai\/sites-vite-plugin/);
});

test("deployment configuration validates required production values without embedding secrets", async () => {
  const [validator, prepare, example] = await Promise.all([
    read("scripts/validate-cloudflare-env.mjs"),
    read("scripts/prepare-cloudflare-deploy.mjs"),
    read(".env.example"),
  ]);

  for (const key of [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    assert.match(validator, new RegExp(key));
    assert.match(example, new RegExp(`^${key}=`, "m"));
  }

  assert.match(prepare, /dist\/server\/wrangler\.json/);
  assert.match(prepare, /config\.d1_databases/);
  assert.match(prepare, /migrations_dir: "\.\.\/\.\.\/migrations"/);
});
