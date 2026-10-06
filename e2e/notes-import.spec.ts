import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { closeToToday, gotoStart, startFromFile, startFromPaste, topicNames } from "./helpers";

const notion = readFileSync("tests/fixtures/notion-export.md", "utf8");
const mdFile = { name: "cell-biology.md", mimeType: "text/markdown", buffer: Buffer.from(notion) };

test("a Notion Markdown export opens a first question, and its topics are listed from the sections", async ({ page }) => {
  await startFromFile(page, mdFile);
  const names = await topicNames(page);
  expect(names).toEqual(expect.arrayContaining(["Cell Membrane", "Osmosis", "Steps of Cellular Respiration", "Active vs Passive Transport"]));
  expect(names).not.toContain("Examples");
  expect(names).not.toContain("Cell Biology: Week 3");
});

test("pasted notes work the same way, and the first question quotes the notes", async ({ page }) => {
  await startFromPaste(page, notion);
  await expect(page.getByRole("button", { name: "Peek at the notes" })).toBeVisible();
  await page.getByRole("button", { name: "Peek at the notes" }).click();
  await expect(page.locator('article[aria-label^="Section"]')).toBeVisible();
});

test("notes with no headings get a clear message and nothing is saved", async ({ page }) => {
  await gotoStart(page);
  await page.getByText("Or paste your notes").click();
  await page.locator("#paste-notes").fill("Osmosis is the movement of water across a membrane. There are no headings in this text.");
  await page.getByRole("button", { name: "Use these notes" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Kelus finds topics from headings");
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { name: "Drop your notes." })).toBeVisible();
});

test("a file that is neither a PDF nor notes is refused with a clear reason", async ({ page }) => {
  await gotoStart(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "picture.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await expect(page.getByText("Choose a PDF, notes as a .md or .txt file, or a Notion export (.zip).")).toBeVisible();
});

test("a notes source is still there after the page is reloaded", async ({ page }) => {
  await startFromFile(page, mdFile);
  await closeToToday(page);
  await page.goto("/today?section=materials");
  await expect(page.locator(".material-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".material-card")).toHaveCount(1);
  await expect(page.locator(".material-card")).toContainText("cell biology");
  await expect(page.locator(".material-card")).toContainText(/topics? from this source/);
});

test("a Notion zip export becomes topics, with page names free of Notion ids", async ({ page }) => {
  await startFromFile(page, "tests/fixtures/notion-export.zip");
  const names = await topicNames(page);
  expect(names).toEqual(expect.arrayContaining(["Active transport", "Osmosis"]));
  expect(names.join(" ")).not.toMatch(/[0-9a-f]{32}|Biology Week 3|Empty page/);
});

test("a zip with no pages with text says what to do instead of failing silently", async ({ page }) => {
  await gotoStart(page);
  const empty = Buffer.from("PK\x05\x06" + "\0".repeat(18), "binary");
  await page.locator('input[type="file"]').setInputFiles({ name: "empty.zip", mimeType: "application/zip", buffer: empty });
  await expect(page.getByRole("alert").filter({ hasText: /Markdown|pages|zip/i })).toBeVisible();
});

test("the daily reminder waits for a real exam date, then repeats until it", async ({ page }) => {
  await startFromFile(page, mdFile);
  await closeToToday(page);
  // No date yet: Kelus asks for it instead of offering a reminder that would end on a made-up day.
  await expect(page.getByRole("region", { name: "Make it a daily habit" })).toHaveCount(0);
  const ask = page.getByRole("region", { name: "When is your exam?" });
  await expect(ask).toBeVisible();
  const exam = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
  await ask.getByLabel("Exam date").fill(exam);
  await ask.getByRole("button", { name: "Save date" }).click();
  await expect(ask).toHaveCount(0);

  const card = page.getByRole("region", { name: "Make it a daily habit" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("can’t send notifications while it’s closed");
  await card.getByLabel("Remind me at").selectOption("20:00");
  const [download] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: "Add to my calendar" }).click()]);
  expect(download.suggestedFilename()).toBe("kelus-daily-study.ics");
  const text = (await import("node:fs")).readFileSync(await download.path(), "utf8");
  expect(text).toMatch(new RegExp(`RRULE:FREQ=DAILY;UNTIL=${exam.replace(/-/g, "")}T`));
  expect(text).toMatch(/DTSTART:\d{8}T200000/);
  expect(text).toContain("BEGIN:VALARM");
  await expect(card.getByRole("status")).toContainText("Downloaded");
});

test("your own file never mixes into the sample: it starts your own course, and the sample is replaced", async ({ page }) => {
  await page.goto("/today?sample=1");
  await expect(page.getByText("Sample course")).toBeVisible();
  await page.locator('input[aria-label="Choose a course PDF"]').setInputFiles({ name: "my-notes.md", mimeType: "text/markdown", buffer: Buffer.from(notion) });
  const dialog = page.getByRole("dialog", { name: "Start your own course?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("my-notes.md");

  // Keeping the sample changes nothing.
  await dialog.getByRole("button", { name: "Keep the sample" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Sample course")).toBeVisible();

  await page.locator('input[aria-label="Choose a course PDF"]').setInputFiles({ name: "my-notes.md", mimeType: "text/markdown", buffer: Buffer.from(notion) });
  await page.getByRole("dialog", { name: "Start your own course?" }).getByRole("button", { name: "Start my own course" }).click();

  // The file starts your own course and opens its first question; none of the sample is left.
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
  await closeToToday(page);
  await expect(page.getByText("Sample course")).toHaveCount(0);
  await expect(page.locator("#today-title")).not.toHaveText(/Elasticity|Supply|Monetary/);
});

// Reads the engine from a public CDN, so it needs a network and is skipped in CI to keep CI deterministic.
test("a scanned, image-only PDF is read with on-device OCR and becomes topics", async ({ page }) => {
  test.skip(Boolean(process.env.CI), "needs the OCR engine from a CDN");
  test.setTimeout(120_000);
  await startFromFile(page, "tests/fixtures/scanned-notes.pdf");
  expect(await topicNames(page)).toEqual(expect.arrayContaining(["Osmosis", "Enzymes"]));
});

test("a course with no topics is one screen with one job, and adding notes there continues the normal flow", async ({ page }) => {
  await startFromFile(page, mdFile);
  await closeToToday(page);
  await page.getByRole("button", { name: /^Remove cell biology/i }).click();
  await page.getByRole("group", { name: /Confirm remove/ }).getByRole("button", { name: "Remove" }).click();

  await expect(page.getByRole("heading", { name: "Add your notes." })).toBeVisible();
  // Not a second form: no source-role dropdown, no bookmark box, no empty-binder panel, a single file picker.
  await expect(page.getByLabel("This source is")).toHaveCount(0);
  await expect(page.getByText("Save a video or web link instead")).toHaveCount(0);
  await expect(page.getByText("Empty binder")).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(1);

  await page.locator('input[type="file"]').setInputFiles(mdFile);
  // The notes are read quietly and the first question opens: no checklist in between.
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
});

test("a file with no real topics says so plainly and returns to the start screen", async ({ page }) => {
  await gotoStart(page);
  const admin = "# Syllabus\nOffice hours are on Monday afternoons in the main building and attendance is recorded each week.\n\n# Grading policy\nLate submissions lose ten percent per day and the course schedule is posted on the noticeboard.";
  await page.locator('input[type="file"]').setInputFiles({ name: "admin.md", mimeType: "text/markdown", buffer: Buffer.from(admin) });
  await expect(page.getByRole("heading", { name: "Kelus couldn’t find topics in this file." })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Try another file" }).click();
  await expect(page.getByRole("heading", { name: /^(Drop|Add) your notes\.$/ })).toBeVisible();
  // The failed file is gone, so a good one works straight away.
  await page.locator('input[type="file"]').setInputFiles(mdFile);
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
});

test("a topic that is not real can be removed from the question screen, with a confirmation", async ({ page }) => {
  await startFromFile(page, mdFile);
  const title = (await page.locator(".study-run-label").innerText()).split(" · ")[0];
  const before = await topicNames(page);
  expect(before).toContain(title);
  await page.goto("/today");
  await page.getByRole("button", { name: /Start this topic|Resume session/ }).first().click();
  await expect(page).toHaveURL(/\/session/);
  await page.getByRole("button", { name: "Not a real topic? Remove it" }).click();
  await expect(page.getByRole("group", { name: "Confirm remove this topic" })).toContainText(title);
  await page.getByRole("button", { name: "Keep" }).click();
  await expect(page.getByRole("button", { name: "Not a real topic? Remove it" })).toBeVisible();
  await page.getByRole("button", { name: "Not a real topic? Remove it" }).click();
  await page.getByRole("button", { name: "Yes, remove" }).click();
  await expect(page).toHaveURL(/\/today/);
  const after = await topicNames(page);
  expect(after).toHaveLength(before.length - 1);
  expect(after).not.toContain(title);
});

test("the exam date is asked after the first run, not before, and a real date turns on the countdown", async ({ page }) => {
  await startFromFile(page, mdFile);
  await closeToToday(page);
  await expect(page.getByText(/no date yet/)).toBeVisible();
  await expect(page.getByText(/days? to exam/)).toHaveCount(0);
  const ask = page.getByRole("region", { name: "When is your exam?" });
  await ask.getByRole("button", { name: "Save date" }).click();
  await expect(ask.getByRole("alert")).toContainText("Pick the day of your exam.");
  const exam = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10);
  await ask.getByLabel("Exam date").fill(exam);
  await ask.getByRole("button", { name: "Save date" }).click();
  await expect(page.getByText(/\d+ days? to go/)).toBeVisible();
  await expect(page.getByText(/days? to exam/).first()).toBeVisible();
});

test("a leftover built-in sample never names the start screen or receives your notes", async ({ page }) => {
  await page.goto("/today?sample=1");
  await page.getByRole("button", { name: "Remove Built-in Microeconomics example" }).click();
  await page.getByRole("group", { name: /Confirm remove/ }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Drop your notes." })).toBeVisible();
  await expect(page.getByText("Microeconomics")).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles(mdFile);
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await closeToToday(page);
  // It is a new course made from the file, not the sample with notes added.
  await expect(page.getByText(/Sample course|Microeconomics/)).toHaveCount(0);
  await expect(page.getByText(/cell biology/i).first()).toBeVisible();
});
