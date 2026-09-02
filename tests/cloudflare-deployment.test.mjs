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
  assert.match(workflow, /SNAPSHOT_WARM_LIMIT: "3"/);
  assert.match(workflow, /SNAPSHOT_WARM_CONCURRENCY: "1"/);
  assert.match(workflow, /snapshots:warm:production/);

  assert.match(config, /"binding": "DB"/);
  assert.match(config, /"binding": "IMAGES"/);
  assert.match(config, /"crons": \["\*\/15 \* \* \* \*"\]/);
  assert.match(viteConfig, /configPath: "\.\/wrangler\.jsonc"/);
  assert.doesNotMatch(viteConfig, /@openai\/sites-vite-plugin/);
  assert.doesNotMatch(packageJson, /@openai\/sites-vite-plugin/);
});

test("post-deploy warming preserves a successful deployment during provider rate limiting", async () => {
  const warmer = await read("scripts/warm-production-snapshots.mjs");

  assert.match(warmer, /rateLimited \+= 1/);
  assert.match(warmer, /existing snapshots remain available/);
  assert.match(warmer, /provider unavailable after deploy; keeping last-known-good snapshots/);
  assert.match(warmer, /if \(failed > 0 && warmed === 0\)/);
});

test("production CI never forces D1-backed product pages into a static export", async () => {
  const nextConfig = await read("next.config.ts");

  assert.doesNotMatch(nextConfig, /output:\s*["']export["']/);
  assert.doesNotMatch(nextConfig, /GITHUB_ACTIONS/);
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
