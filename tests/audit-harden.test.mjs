import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";
import { constants as fsConstants } from "node:fs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("audit harden: smoke meets AA, first-run has h1, session skip target", async () => {
  const [tokens, setup, session, illustration, css, design] = await Promise.all([
    source("tokens.css"),
    source("components/FirstRunSetup.tsx"),
    source("app/session/page.tsx"),
    source("components/hero/StudentIllustration.tsx"),
    source("app/globals.css"),
    source("design.md"),
  ]);

  assert.match(tokens, /--color-smoke:\s*#5b6f92/);
  assert.doesNotMatch(tokens, /--color-smoke:\s*#839bc8/);
  assert.match(setup, /<h1 className="destination-page-title">[\s\S]*Set your exam[\s\S]*<\/h1>/);
  assert.match(session, /fallback=\{[\s\S]*?<main id="main"/);
  assert.match(illustration, /student\.webp/);
  assert.match(illustration, /fetchPriority="high"/);
  assert.match(css, /\.site-header-action[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.site-auth-button[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.hero-demo-tabs button[\s\S]*?min-height:\s*44px/);
  assert.match(design, /#5b6f92/);
  assert.match(design, /44×44px|44x44px|44×44/);

  await access(new URL("public/hero/student.webp", root), fsConstants.R_OK);
  await access(new URL("components/ui/sonner.tsx", root), fsConstants.R_OK);
  await access(new URL("components/ui/tooltip.tsx", root), fsConstants.R_OK);
});

test("audit distill: product only keeps toast and tooltip UI primitives", async () => {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(new URL("components/ui", root))).sort();
  assert.deepEqual(files, ["sonner.tsx", "tooltip.tsx"]);
});
