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
  await expect(page.getByText("Illustrative Microeconomics example.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("An illustrative example.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Illustrative route change, not a predicted grade.")).toHaveCount(0);
  await expect(steps.locator("h3").first()).toHaveCSS("font-family", /Fraunces/i);
  await expect(steps.locator("p").first()).toHaveCSS("font-family", /Inter/i);
  const routeHighlight = page.locator('[data-revision-step="03"] [data-ink-reveal="route"]');
  const routeArt = page.locator('[data-revision-step="03"] div[class*="art"]');
  await expect(routeHighlight).toHaveCSS("opacity", "0");
  await expect(routeArt).toHaveCSS("opacity", "0");
  const entranceOffsets = await steps.locator('div[class*="art"]').evaluateAll((arts) =>
    arts.map((art) => new DOMMatrix(getComputedStyle(art).transform).m41),
  );
  expect(entranceOffsets[0]).toBeGreaterThan(0);
  expect(entranceOffsets[1]).toBeLessThan(0);
  expect(entranceOffsets[2]).toBeGreaterThan(0);

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const step of await steps.all()) {
      await step.scrollIntoViewIfNeeded();
      await expect(step.locator("svg")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(routeHighlight).toHaveCSS("opacity", "1");
  await expect(routeArt).toHaveCSS("opacity", "1");
});

test("reduced motion shows the finished annotations without scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('[data-revision-step="03"] div[class*="art"]')).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-revision-step="01"] [data-ink-reveal="source"]')).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-revision-step="02"] [data-ink-reveal="recall"]')).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-revision-step="03"] [data-ink-reveal="route"]')).toHaveCSS("opacity", "1");
});
