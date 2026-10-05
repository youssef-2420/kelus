import { expect, test } from "@playwright/test";

test("animated study papers remain readable on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const chapters = page.locator("[data-revision-step]");
  await expect(chapters).toHaveCount(3);
  for (const chapter of await chapters.all()) {
    await chapter.scrollIntoViewIfNeeded();
    await expect(chapter.locator("svg")).toBeVisible();
  }

  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "The studying happens here." }) });
  await section.locator("[data-study-loop]").scrollIntoViewIfNeeded();
  await expect(section.locator("[data-paper]")).toHaveCount(3);
  await expect(section.getByText("A study pass, in motion")).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
  await expect(section.locator("[data-study-loop]")).toHaveAttribute("data-phase", "2");
  await expect(section.locator('[data-paper="route"]')).toHaveCSS("opacity", "1");
  await section.screenshot({ path: testInfo.outputPath("animated-study-mobile.png"), animations: "disabled" });
});

test("home keeps the illustrated chapters and the animated study papers", async ({ page }, testInfo) => {
  await page.goto("/");

  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "The studying happens here." }) });
  const steps = page.locator("[data-revision-step]");
  await expect(steps).toHaveCount(3);
  await expect(steps.locator("h3")).toHaveText([
    "Start with your material.",
    "Try it from memory.",
    "See the route change.",
  ]);
  for (const step of await steps.all()) {
    await step.scrollIntoViewIfNeeded();
    await expect(step.locator("svg")).toBeVisible();
  }
  await section.locator("[data-study-loop]").scrollIntoViewIfNeeded();
  await expect(section.locator("[data-study-loop]")).toHaveAttribute("data-phase", "2");
  const replay = section.getByRole("button", { name: "Replay" });
  await replay.click();
  await expect(section.locator("[data-study-loop]")).toHaveAttribute("data-phase", "0");
  await expect(section.locator("[data-study-loop]")).toHaveAttribute("data-phase", "2");
  await expect(section.locator('[data-paper="route"]')).toHaveCSS("opacity", "1");
  await section.screenshot({ path: testInfo.outputPath("animated-study-desktop.png"), animations: "disabled" });
});

test("reduced motion shows the completed study papers without running a loop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "The studying happens here." }) });
  await expect(section.locator("[data-study-loop]")).toHaveAttribute("data-phase", "2");
  await expect(section.getByRole("button", { name: "Replay" })).toHaveCount(0);
});
