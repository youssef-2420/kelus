import { test, expect } from "@playwright/test";

test("How it works owns the detailed source, recall, and route walkthrough", async ({ page }) => {
  await page.goto("/route/");
  const story = page.getByRole("region", { name: "The Kelus revision loop" });
  await expect(story.locator("li")).toHaveCount(3);
  await expect(story.locator("h2")).toHaveText([
    "Start with what you were taught.",
    "Show what you can recall.",
    "See the route respond.",
  ]);

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const step of await story.locator("li").all()) {
      await step.scrollIntoViewIfNeeded();
      await expect(step).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("the walkthrough remains legible when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/route/");
  await expect(page.getByRole("region", { name: "The Kelus revision loop" }).locator("h2")).toHaveCount(3);
});
