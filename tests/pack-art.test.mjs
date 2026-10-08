import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

test("every file the art component points at exists, is a real SVG, and keeps its source note", () => {
  const source = readFileSync("components/PackArt.tsx", "utf8");
  const paths = [...source.matchAll(/src: "(\/art\/notion-pack\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 11);
  for (const path of paths) {
    const file = `public${path}`;
    assert.ok(existsSync(file), `${file} is missing`);
    assert.ok(statSync(file).size > 200, `${file} looks empty`);
    assert.match(readFileSync(file, "utf8"), /<svg[\s>]/);
  }
  // Keep the source and the checked usage terms beside the exported assets.
  const note = readFileSync("public/art/notion-pack/SOURCE.md", "utf8");
  assert.match(note, /Overflow Design/);
  assert.match(note, /https:\/\/www\.overflow\.design\/license\//);
});

test("the art is decorative: hidden from screen readers with empty alt text", () => {
  const source = readFileSync("components/PackArt.tsx", "utf8");
  assert.match(source, /alt=""/);
  assert.match(source, /aria-hidden="true"/);
});
