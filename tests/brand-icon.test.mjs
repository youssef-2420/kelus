import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser favicon uses the header's Recall K instead of the retired green tile", () => {
  const mark = readFileSync("components/KelusLogoMark.tsx", "utf8");
  const icon = readFileSync("app/icon.svg", "utf8");
  const paths = [...mark.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(paths.length, 2);
  for (const path of paths) assert.ok(icon.includes(`<path d="${path}"`));
  assert.match(icon, /stroke="#12160f"/);
  assert.doesNotMatch(icon, /#1f6b45/i);
});
