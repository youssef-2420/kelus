import { expect, test } from "@playwright/test";

test("audit surfaces keep header, privacy, map recovery, and human session labels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Kelus home" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Map" })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Shared devices" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();

  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "Set your exam first." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Set your exam/ })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();

  await page.goto("/today?sample=1");
  await expect(page.getByRole("heading", { name: /Today/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Course navigation" }).getByRole("link", { name: "Map", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /remaining days until your exam/i })).toBeVisible();
  await expect(page.getByText(/min\/day/)).toBeVisible();

  await page.locator("button.today-start").click();
  await expect(page.getByText(/01 \/ 04 · Learn/)).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await page.getByRole("button", { name: /Retrieve it/ }).click();
  await expect(page.getByText(/02 \/ 04 · Retrieve/)).toBeVisible();
});

test("audit surfaces stay usable at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Kelus home" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Shared devices" })).toBeVisible();
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: /remaining days until your exam/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
});
