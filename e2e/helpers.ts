import { expect, type Page } from "@playwright/test";

export type UploadFile = string | { name: string; mimeType: string; buffer: Buffer };

/** Opens the start screen and waits until its scripts have run, so a file chosen at once is not lost. */
export async function gotoStart(page: Page) {
  await page.goto("/today", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
}

/** The one-step start: drop a file, and the first question opens by itself. */
export async function startFromFile(page: Page, file: UploadFile) {
  await gotoStart(page);
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
}

export async function startFromPaste(page: Page, text: string) {
  await gotoStart(page);
  await page.getByText("Or paste your notes").click();
  await page.locator("#paste-notes").fill(text);
  await page.getByRole("button", { name: "Use these notes" }).click();
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
}

/** Leaves the first question and lands on Today. */
export async function closeToToday(page: Page) {
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("#today-title")).toBeVisible();
}

export async function topicNames(page: Page) {
  await page.goto("/today?section=map");
  await expect(page.locator(".index-toc-name").first()).toBeVisible();
  return page.locator(".index-toc-name").allInnerTexts();
}

/** Answers every quick check (a wrong gap word, or option 1), then explains and rates itself. */
export async function playQuickRun(page: Page, explanation = "It depends on how easily buyers can switch.", grade = "Nailed it") {
  for (let guard = 0; guard < 6; guard += 1) {
    await expect(page.locator('#run-explain, input[id^="run-gap"]:not([disabled]), [role="group"][aria-label="Choose one"] button:not([disabled])').first()).toBeVisible();
    if (await page.locator("#run-explain").count()) break;
    const gap = page.locator('input[id^="run-gap"]:not([disabled])');
    if (await gap.count()) {
      await gap.fill("zzz");
      await page.getByRole("button", { name: "Check", exact: true }).click();
    } else {
      await page.getByRole("group", { name: "Choose one" }).getByRole("button").first().click();
    }
    await page.getByRole("button", { name: /^(Next|Now say it yourself)/ }).click();
  }
  await page.locator("#run-explain").fill(explanation);
  await page.getByRole("button", { name: /Compare with the page/ }).click();
  await page.getByRole("button", { name: new RegExp(grade) }).click();
}
