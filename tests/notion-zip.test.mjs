import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { notesFromZip, pageTitleFromPath } from "../domain/notion-zip.ts";
import { listZip } from "../domain/zip-read.ts";
import { markdownToPages } from "../domain/markdown-pages.ts";

const zip = readFileSync(new URL("./fixtures/notion-export.zip", import.meta.url));

test("page titles lose Notion's 32-character ids and the extension", () => {
  assert.equal(pageTitleFromPath("Export/Biology Week 3 0123456789abcdef0123456789abcdef/Osmosis aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md"), "Osmosis");
  assert.equal(pageTitleFromPath("Plain note.md"), "Plain note");
});

test("the zip is listed without folders, and entries inflate to their text", async () => {
  const entries = listZip(zip);
  assert.ok(entries.length >= 5);
  const osmosis = entries.find((entry) => /Osmosis/.test(entry.path) && !entry.path.includes("__MACOSX"));
  assert.match(new TextDecoder().decode(await osmosis.read()), /selectively permeable membrane/);
});

test("a Notion export becomes one Markdown document: real pages in, junk, images, csv and empty pages out", async () => {
  const { markdown, pages, skipped } = await notesFromZip(zip);
  assert.match(markdown, /# Osmosis/);
  assert.match(markdown, /# Active transport/); // no heading in the file: the title is added
  assert.match(markdown, /sodium-potassium pump/);
  assert.doesNotMatch(markdown, /Created: October 1|PNG|a,b|junk|0123456789abcdef/);
  assert.equal(pages, 2);
  assert.ok(skipped >= 2); // the parent with only links and the empty page
});

test("the document splits into one topic section per page, ready for the notes importer", async () => {
  const { markdown } = await notesFromZip(zip);
  const sections = markdownToPages(markdown);
  assert.equal(sections.length, 2);
  assert.match(sections[0].text + sections[1].text, /Why cells need it/);
});

test("things that are not zips, or have no pages, fail with a clear message", async () => {
  await assert.rejects(() => notesFromZip(new TextEncoder().encode("not a zip at all")), /zip/i);
});
