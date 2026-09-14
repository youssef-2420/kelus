import { test, expect } from "@playwright/test";

test("practice evidence stays below the route and survives reload", async ({ page }) => {
  await page.goto("/today?sample=1");
  const evidence = page.getByRole("region", { name: "Practice evidence" });
  await expect(evidence).toBeVisible();
  await expect(page.getByText("Est. readiness", { exact: false })).toHaveCount(0);
  await expect(evidence).toContainText("Question coverage:");
  await expect(evidence).toContainText("Mastery on reviewed questions:");
  const before = await evidence.textContent();
  await evidence.getByText("See evidence by topic").click();
  await expect(evidence).toContainText("Limited question coverage");
  await page.reload();
  await expect(evidence).toBeVisible();
  await expect(evidence).toHaveText(before!);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(evidence).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
