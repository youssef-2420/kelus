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

test("revision photographs are user-controlled and keep their captions in sync", async ({ page }) => {
  await page.goto("/");

  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "The studying happens here." }) });
  await expect(section.getByRole("img", { name: /reviewing printed lecture notes/ })).toBeVisible();
  await expect(section.getByText("Begin with your notes")).toBeVisible();

  await section.getByRole("button", { name: "Next revision photo" }).click();
  await expect(section.getByRole("img", { name: /writing an answer from memory/ })).toBeVisible();
  await expect(section.getByText("Try it from memory")).toBeVisible();

  await section.getByRole("button", { name: "Next revision photo" }).click();
  await expect(section.getByRole("img", { name: /checking a handwritten answer/ })).toBeVisible();
  await expect(section.getByText("Check what needs work")).toBeVisible();

  await section.getByRole("button", { name: "Next revision photo" }).click();
  await expect(section.getByText("Begin with your notes")).toBeVisible();
});
