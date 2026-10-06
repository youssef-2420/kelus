import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { looksLikeMarkdownHeadings, markdownToPages, plainInline } from "../domain/markdown-pages.ts";
import { buildConfirmedMaterialModel, isSourceBackedProposal, proposeConceptsFromPages } from "../domain/material-intelligence.ts";
import { quoteIsOnPage } from "../domain/content-engine.ts";

const notion = readFileSync(new URL("./fixtures/notion-export.md", import.meta.url), "utf8");

test("markup is removed but the words stay", () => {
  assert.equal(plainInline("The **cell membrane** is a *selectively permeable* barrier. See [the textbook](https://x.com)."), "The cell membrane is a selectively permeable barrier. See the textbook.");
  assert.equal(plainInline("![diagram](a.png) and `code` and ~~old~~ and [[Page link|label]]"), "diagram and code and old and label");
});

test("a Notion export becomes one page per section, with headings kept apart from body text", () => {
  const pages = markdownToPages(notion);
  assert.deepEqual(pages.map((page) => page.text.split("\n")[0]), ["Cell Membrane", "Osmosis", "Steps of Cellular Respiration", "Active vs Passive Transport"]);
  assert.deepEqual(pages.map((page) => page.pageNumber), [1, 2, 3, 4]);
  const membrane = pages[0];
  assert.match(membrane.text, /• Phospholipid bilayer: two layers of lipids/);
  assert.doesNotMatch(membrane.text, /\*\*|\]\(|!\[|\[ \]/);
  assert.ok(membrane.blocks.find((block) => block.text === "Cell Membrane").fontSize > membrane.blocks.find((block) => block.text.startsWith("• Fluid")).fontSize);
});

test("tables become term: meaning lines and numbered steps keep their numbers", () => {
  const pages = markdownToPages(notion);
  assert.match(pages[1].text, /Hypotonic: water enters the cell, the cell swells/);
  assert.doesNotMatch(pages[1].text, /---|Condition: What happens/);
  assert.match(pages[2].text, /1\. Glycolysis occurs[\s\S]*2\. The Krebs cycle[\s\S]*3\. The electron transport chain/);
});

test("the topic finder works on notes unchanged, and locators say Section", () => {
  const pages = markdownToPages(notion);
  const proposals = proposeConceptsFromPages({ materialId: "m", sourceLabel: "Cell Biology", pages, locatorLabel: "Section" }).filter(isSourceBackedProposal);
  const names = proposals.map((proposal) => proposal.name);
  for (const expected of ["Cell Membrane", "Osmosis", "Steps of Cellular Respiration", "Active vs Passive Transport"]) assert.ok(names.includes(expected), `missing ${expected}: ${names}`);
  assert.ok(proposals.every((proposal) => /^Section \d+$/.test(proposal.locator)));
  assert.ok(!names.includes("Cell Biology: Week 3"), "the document title and its properties are not a study topic");
});

test("questions from notes quote the notes and use the page's own terms", () => {
  const pages = markdownToPages(notion);
  const proposals = proposeConceptsFromPages({ materialId: "m", sourceLabel: "Cell Biology", pages, locatorLabel: "Section" }).filter(isSourceBackedProposal);
  const model = buildConfirmedMaterialModel({ proposals, courseId: "c", userId: "u", nowIso: new Date().toISOString(), pages });
  const all = pages.map((page) => page.text).join("\n");
  let items = 0;
  for (const activity of model.learningActivities) for (const item of activity.practice ?? []) { items += 1; assert.ok(quoteIsOnPage(item.sourceQuote, all), item.sourceQuote); }
  assert.ok(items >= 8, `expected a decent number of questions, got ${items}`);
  const osmosis = model.learningActivities.find((activity) => activity.learn.title === "Osmosis");
  assert.ok(osmosis.practice.some((item) => /Which one matches/.test(item.prompt) && item.choices.every((choice) => /^(Isotonic|Hypotonic|Hypertonic)$/.test(choice))));
});

test("notes without headings give no pages, so the caller can ask for headings", () => {
  assert.deepEqual(markdownToPages("Just a paragraph of text with no structure at all."), []);
  assert.equal(looksLikeMarkdownHeadings("Just text"), false);
  assert.equal(looksLikeMarkdownHeadings("# A\ntext"), true);
});

test("front matter, comments and code fences do not break the parse", () => {
  const pages = markdownToPages("---\ntitle: x\n---\n# A\n\n<!-- hidden -->\n## One\ntext here that is long enough to matter.\n```js\nlet a = 1;\n```\n## Two\nmore text that is long enough to matter.");
  assert.deepEqual(pages.map((page) => page.text.split("\n")[0]), ["One", "Two"]);
  assert.doesNotMatch(pages.map((page) => page.text).join(" "), /hidden|title: x/);
  assert.match(pages[0].text, /let a = 1;/);
});

test("an opening section with real content of its own is kept", () => {
  const intro = "This course covers how cells move materials across membranes, why that matters for energy, and how the cell regulates what enters and leaves. ".repeat(3);
  const pages = markdownToPages(`# Course notes\n\n${intro}\n\n## One\ntext here that is long enough to matter.\n\n## Two\nmore text that is long enough to matter.`);
  assert.equal(pages.length, 3);
  assert.equal(pages[0].text.split("\n")[0], "Course notes");
});

test("generic headings such as Examples and Summary are not proposed as study topics", () => {
  const pages = markdownToPages(readFileSync(new URL("./fixtures/notion-export.md", import.meta.url), "utf8") + "\n\n## Summary\nThis section restates what the lecture covered in a few words for review.\n");
  const names = proposeConceptsFromPages({ materialId: "m", sourceLabel: "x", pages, locatorLabel: "Section" }).filter(isSourceBackedProposal).map((proposal) => proposal.name);
  assert.ok(!names.includes("Examples") && !names.includes("Summary"), String(names));
  assert.ok(names.includes("Active vs Passive Transport"));
});

test("a saved notes source survives being read back from storage", async () => {
  const { normalizeMaterial } = await import("../lib/material-store.ts");
  const saved = { id: "material-1", courseId: "c", kind: "text", storage: "local", title: "Cell biology", sourceUrl: null, fileName: "cell.md", mimeType: "text/markdown", sizeBytes: 100, role: "notes", processingStatus: "ready", addedAt: "2026-10-06T00:00:00.000Z" };
  assert.equal(normalizeMaterial(saved)?.kind, "text");
  assert.equal(normalizeMaterial({ ...saved, kind: "spreadsheet" }), null);
});
