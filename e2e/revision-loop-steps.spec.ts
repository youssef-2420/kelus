import { test, expect } from "@playwright/test";

test("the revision loop unfolds as three separate, readable steps", async ({ page }) => {
  await page.goto("/");
  const steps = page.locator("[data-revision-step]");
  await expect(steps).toHaveCount(3);
  await expect(steps.locator("h3")).toHaveText([
    "Start with your material.",
    "Try it from memory.",
    "See the route change.",
  ]);
  const routeHighlight = page.locator('[data-revision-step="03"] path[class*="routeUnderline"]');
  await expect(routeHighlight).toHaveCSS("opacity", "0");

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const step of await steps.all()) {
      await step.scrollIntoViewIfNeeded();
      await expect(step.locator("svg")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(routeHighlight).toHaveCSS("opacity", "0.22");
});

test("reduced motion shows the finished annotations without scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('[data-revision-step="01"] path[class*="sourceUnderline"]')).toHaveCSS("opacity", "0.22");
  await expect(page.locator('[data-revision-step="02"] path[class*="correction"]')).toHaveCSS("opacity", "0.75");
  await expect(page.locator('[data-revision-step="03"] path[class*="routeUnderline"]')).toHaveCSS("opacity", "0.22");
});
