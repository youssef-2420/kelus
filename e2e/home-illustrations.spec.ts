import { expect, test } from "@playwright/test";

test("animated study papers remain readable on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

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

test("home shows one study animation while How it works owns the detailed steps", async ({ page }, testInfo) => {
  await page.goto("/");

  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "The studying happens here." }) });
  await expect(page.locator("[data-revision-step]")).toHaveCount(0);
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
