import { expect, test } from "@playwright/test";

test("the four study scenes and student illustration fit on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const chapters = page.locator("[data-revision-step]");
  await expect(chapters).toHaveCount(4);
  for (const chapter of await chapters.all()) {
    await chapter.scrollIntoViewIfNeeded();
    await expect(chapter.locator("svg")).toBeVisible();
  }
  await chapters.first().screenshot({ path: testInfo.outputPath("study-scene-mobile.png"), animations: "disabled" });

  const studying = page.locator("section").filter({ has: page.getByRole("heading", { name: "The studying happens here." }) });
  await studying.scrollIntoViewIfNeeded();
  await expect(studying.getByRole("img", { name: "A student revising at a desk" })).toBeVisible();
  await studying.screenshot({ path: testInfo.outputPath("student-study-mobile.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("home tells the notes → recall → feedback → route story", async ({ page }, testInfo) => {
  await page.goto("/");
  const steps = page.locator("[data-revision-step]");
  await expect(steps.locator("h3")).toHaveText([
    "Start with your material.",
    "Try it from memory.",
    "Check what held up.",
    "See the route change.",
  ]);
  for (const step of await steps.all()) {
    await step.scrollIntoViewIfNeeded();
    await expect(step.locator("svg")).toBeVisible();
  }
  await steps.nth(2).screenshot({ path: testInfo.outputPath("feedback-scene-desktop.png"), animations: "disabled" });
  await expect(page.getByRole("img", { name: "A student revising at a desk" })).toBeVisible();
});

test("reduced motion keeps the illustrated sequence visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-revision-step] svg")).toHaveCount(4);
  await expect(page.getByRole("img", { name: "A student revising at a desk" })).toBeVisible();
});
