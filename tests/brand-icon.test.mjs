import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";

test("browser favicon uses the header's Recall K instead of the retired green tile", () => {
  const mark = readFileSync("components/KelusLogoMark.tsx", "utf8");
  const icon = readFileSync("app/icon.svg", "utf8");
  const paths = [...mark.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(paths.length, 2);
  for (const path of paths) assert.ok(icon.includes(`<path d="${path}"`));
  assert.match(icon, /stroke="#12160f"/);
  assert.doesNotMatch(icon, /#1f6b45/i);
});

test("early browser favicon fallback matches the Recall K SVG at every size", async () => {
  const svg = readFileSync("app/icon.svg");
  const ico = readFileSync("app/favicon.ico");
  const sizes = [16, 32, 48, 64];

  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), sizes.length);
  for (let index = 0; index < sizes.length; index += 1) {
    const entry = 6 + index * 16;
    const size = ico.readUInt8(entry);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    const expected = await sharp(svg).resize(size, size).png().toBuffer();
    assert.equal(size, sizes[index]);
    assert.deepEqual(ico.subarray(offset, offset + length), expected);
  }
});
