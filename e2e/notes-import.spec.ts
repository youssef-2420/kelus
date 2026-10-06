import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const notion = readFileSync("tests/fixtures/notion-export.md", "utf8");

async function toTopicReview(page: Page) {
  await page.getByRole("button", { name: /Continue to exam details/ }).click();
  await page.getByRole("textbox", { name: "Course", exact: true }).fill("Cell Biology");
  await page.getByLabel("Exam").fill("Midterm");
  await page.getByLabel("When is it?").fill(new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: /Read my/ }).click();
  await expect(page.getByRole("heading", { name: /Kelus found/ })).toBeVisible();
}

test("a Notion Markdown export becomes topics with Section locators, never Page", async ({ page }) => {
  await page.goto("/today");
  await page.locator('.setup-first-upload input[type="file"]').setInputFiles({ name: "cell-biology.md", mimeType: "text/markdown", buffer: Buffer.from(notion) });
  await toTopicReview(page);
  await expect(page.getByRole("heading", { name: "Check the topics from your notes." })).toBeVisible();
  const names = await page.locator("input.proposal-name-input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  expect(names).toEqual(expect.arrayContaining(["Cell Membrane", "Osmosis", "Steps of Cellular Respiration", "Active vs Passive Transport"]));
  expect(names).not.toContain("Examples");
  expect(names).not.toContain("Cell Biology: Week 3");
  await expect(page.getByText(/Section 1 · text Kelus read/)).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).toMatch(/· Section \d/);
  expect(text).not.toMatch(/· Page \d/);
});

test("pasted notes work the same way, and a quick run quotes the notes", async ({ page }) => {
  await page.goto("/today");
  await page.getByText("Or paste your notes").click();
  await page.locator("#paste-notes").fill(notion);
  await page.getByRole("button", { name: "Use these notes" }).click();
  await toTopicReview(page);
  await page.getByRole("button", { name: /Confirm topics/ }).click();
  await expect(page.getByRole("heading", { name: /Osmosis|Cell Membrane|Steps of Cellular Respiration|Active vs Passive Transport/ }).first()).toBeVisible();
  await expect(page.locator('article[aria-label^="Section"]')).toBeVisible();
  await page.getByRole("button", { name: /Start this topic|Resume session/ }).first().click();
  await expect(page).toHaveURL(/\/session/);
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
});

test("notes with no headings get a clear message and nothing is saved", async ({ page }) => {
  await page.goto("/today");
  await page.getByText("Or paste your notes").click();
  await page.locator("#paste-notes").fill("Osmosis is the movement of water across a membrane. There are no headings in this text.");
  await page.getByRole("button", { name: "Use these notes" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Kelus finds topics from headings");
  // Nothing was accepted, so continuing still asks for a source.
  await page.getByRole("button", { name: /Continue to exam details/ }).click();
  await expect(page.getByText(/Choose a syllabus, lecture PDF, or your notes to begin/)).toBeVisible();
});

test("a file that is neither a PDF nor notes is refused with a clear reason", async ({ page }) => {
  await page.goto("/today");
  await page.locator('.setup-first-upload input[type="file"]').setInputFiles({ name: "picture.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await expect(page.getByText("Choose a PDF, notes as a .md or .txt file, or a Notion export (.zip).")).toBeVisible();
});

test("a notes source is still there after the page is reloaded", async ({ page }) => {
  await page.goto("/today");
  await page.locator('.setup-first-upload input[type="file"]').setInputFiles({ name: "cell-biology.md", mimeType: "text/markdown", buffer: Buffer.from(notion) });
  await toTopicReview(page);
  await page.getByRole("button", { name: /Confirm topics/ }).click();
  await page.goto("/today?section=materials");
  await expect(page.locator(".material-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".material-card")).toHaveCount(1);
  await expect(page.locator(".material-card")).toContainText("cell biology");
  await expect(page.locator(".material-card")).toContainText(/topics? from this source/);
  await page.goto("/today");
  await expect(page.locator('article[aria-label^="Section"]')).toBeVisible();
});

test("a Notion zip export becomes topics, with page names free of Notion ids", async ({ page }) => {
  await page.goto("/today");
  await page.locator('.setup-first-upload input[type="file"]').setInputFiles("tests/fixtures/notion-export.zip");
  await expect(page.getByText(/Ready to read/)).toBeVisible();
  await toTopicReview(page);
  const names = await page.locator("input.proposal-name-input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  expect(names).toEqual(expect.arrayContaining(["Active transport", "Osmosis"]));
  expect(names.join(" ")).not.toMatch(/[0-9a-f]{32}|Biology Week 3|Empty page/);
  await expect(page.getByText(/Section \d · text Kelus read/).first()).toBeVisible();
});

test("a zip with no pages with text says what to do instead of failing silently", async ({ page }) => {
  await page.goto("/today");
  const empty = Buffer.from("PK\x05\x06" + "\0".repeat(18), "binary");
  await page.locator('.setup-first-upload input[type="file"]').setInputFiles({ name: "empty.zip", mimeType: "application/zip", buffer: empty });
  await expect(page.locator("#setup-error")).toContainText(/Markdown|pages|zip/i);
});

test("a real course offers a daily calendar reminder that repeats until the exam", async ({ page }) => {
  await page.goto("/today");
  await page.locator('.setup-first-upload input[type="file"]').setInputFiles({ name: "cell-biology.md", mimeType: "text/markdown", buffer: Buffer.from(notion) });
  await toTopicReview(page);
  await page.getByRole("button", { name: /Confirm topics/ }).click();
  const card = page.getByRole("region", { name: "Make it a daily habit" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("can’t send notifications while it’s closed");
  await card.getByLabel("Remind me at").selectOption("20:00");
  const [download] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: "Add to my calendar" }).click()]);
  expect(download.suggestedFilename()).toBe("kelus-daily-study.ics");
  const text = (await import("node:fs")).readFileSync(await download.path(), "utf8");
  expect(text).toMatch(/RRULE:FREQ=DAILY;UNTIL=\d{8}T\d{6}/);
  expect(text).toMatch(/DTSTART:\d{8}T200000/);
  expect(text).toContain("BEGIN:VALARM");
  await expect(card.getByRole("status")).toContainText("Downloaded");
});
