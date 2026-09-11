import { expect, test } from "@playwright/test";

test("notebook preview is keyboard-operable and setup fits mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const board = page.locator(".notion-board");
  const reveal = board.getByRole("button", { name: "Reveal answer" });
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(board.locator("#board-answer")).toBeVisible();
  await expect(board.getByRole("button", { name: "Hide answer" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(board.locator("#board-answer")).toBeHidden();
  await expect(board.getByRole("button", { name: "Reveal answer" })).toHaveAttribute("aria-expanded", "false");
  await page.goto("/today");
  await expect(page.getByLabel("Course")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("hero content is visible before hydration", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".notion-board")).toBeVisible();
  await context.close();
});

test("hero recall preview reveals, reorders, resets, and works on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Revise your lessons");

  const board = page.locator(".notion-board");
  await board.scrollIntoViewIfNeeded();

  await expect(board.locator("#board-answer")).toBeHidden();
  await board.getByRole("button", { name: "Reveal answer" }).click();
  await expect(board.getByText("Water moves by osmosis", { exact: false })).toBeVisible();
  await board.getByRole("button", { name: "I remembered" }).click();
  await expect(board.locator(".notion-flow-route li").first()).toContainText("Cell respiration");
  await board.getByRole("button", { name: "Hide answer" }).click();
  await expect(board.locator("#board-answer")).toBeHidden();
  await expect(board.getByRole("button", { name: "Reveal answer" })).toHaveAttribute("aria-expanded", "false");
  await expect(board.locator(".notion-flow-route li").first()).toContainText("Osmosis");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a direct completion URL never invents a completed session", async ({ page }) => {
  await page.goto("/session/complete?id=missing-session");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No completed session here yet.");
  await expect(page.getByRole("link", { name: "Back to Today" })).toBeVisible();
  await expect(page.getByText("estimated readiness", { exact: true })).toHaveCount(0);
});

test("the learning story stays continuous at every supported mobile width", async ({ page }) => {
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/route");
    const stages = page.locator(".how-loop > ol > li");
    await expect(stages).toHaveCount(6);
    for (const stage of await stages.all()) {
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toBeVisible();
      await expect(stage.getByRole("heading", { level: 2 })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
