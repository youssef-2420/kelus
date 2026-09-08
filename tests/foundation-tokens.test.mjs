import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("foundation tokens expose layout, elevation, focus, and z-index scales", async () => {
  const tokens = await source("tokens.css");
  for (const name of [
    "--section-rhythm",
    "--shell-width",
    "--shell-narrow",
    "--study-width",
    "--workspace-width",
    "--focus-ring-width",
    "--focus-ring-offset",
    "--z-header",
    "--z-sheet",
    "--surface-0",
    "--surface-sheet",
    "--elevation-1",
    "--material-panel",
    "--atmosphere-top",
  ]) {
    assert.match(tokens, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(tokens, /--ease-enter:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
});

test("motion module exports shared kelusMotion and sheet helpers", async () => {
  const motion = await source("components/motion/index.tsx");
  assert.match(motion, /export const kelusMotion/);
  assert.match(motion, /bounce:\s*0/);
  assert.match(motion, /export function Fade/);
  assert.match(motion, /export function sheetMotion/);
  assert.match(motion, /whileInView/);
});

test("foundation utilities and product surfaces are wired in globals", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /\.surface-raised\s*\{/);
  assert.match(css, /\.rule-ledger\s*\{/);
  assert.match(css, /\.focus-ring:focus-visible\s*\{/);
  assert.match(css, /\.concept-inspector\s*\{[\s\S]*?--surface-sheet/);
  assert.match(css, /\.session-source-panel\s*\{[\s\S]*?--surface-sheet/);
  assert.match(css, /z-index:\s*var\(--z-header\)/);
});

test("design.md documents materials policy and motion module", async () => {
  const design = await source("design.md");
  assert.match(design, /Materials & depth/);
  assert.match(design, /kelusMotion/);
  assert.match(design, /#5b6f92/);
  assert.match(design, /44×44px|44x44px|44×44/);
});
