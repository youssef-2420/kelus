import { expect, test } from "@playwright/test";

test("hero recall preview reveals, reorders, resets, and works on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Revise your lessons");
  const preview = page.getByRole("region", { name: "Try a revision question" });
  await expect(preview.getByText("Water moves by osmosis", { exact: false })).toHaveCount(0);
  await preview.getByRole("button", { name: "Reveal answer" }).click();
  await expect(preview.getByText("Water moves by osmosis", { exact: false })).toBeVisible();
  await preview.getByRole("button", { name: "I remembered it" }).click();
  await expect(page.locator(".hero-demo-route li").first()).toContainText("Cell respiration");
  await page.getByRole("button", { name: "Computer science", exact: true }).click();
  await expect(preview.getByRole("heading")).toContainText("hash table");
  await expect(preview.getByRole("button", { name: "Reveal answer" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.locator(".hero-demo-route li").first()).toContainText("Hash tables");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a direct completion URL never invents a completed session", async ({ page }) => {
  await page.goto("/session/complete?id=missing-session");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No completed session here yet.");
  await expect(page.getByRole("link", { name: "Back to Today" })).toBeVisible();
  await expect(page.getByText("estimated readiness", { exact: true })).toHaveCount(0);
});
