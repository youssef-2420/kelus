import { test, expect } from "@playwright/test";

test("Today is one next block — no planner queue or practice evidence footer", async ({ page }) => {
  await page.goto("/today?sample=1");
  await expect(page.locator("details[aria-label='Practice evidence']")).toHaveCount(0);
  await expect(page.getByText("Next stops", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Est. readiness", { exact: false })).toHaveCount(0);
  await expect(page.locator(".today-plan-list")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Start Elasticity/ })).toBeVisible();
  await expect(page.getByText("Next", { exact: true }).first()).toBeVisible();
});
