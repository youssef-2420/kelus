import { expect, test } from "@playwright/test";

test("illustrated revision sequence remains readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const steps = page.locator("[data-revision-step]");
  await expect(steps).toHaveCount(3);
  for (const step of await steps.all()) {
    await step.scrollIntoViewIfNeeded();
    await expect(step.locator("svg")).toBeVisible();
    await expect(step.locator("h3")).toBeVisible();
  }

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
});
