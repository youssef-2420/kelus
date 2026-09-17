import { test, expect } from "@playwright/test";

test("practice evidence stays below the route and survives reload", async ({ page }) => {
  await page.goto("/today?sample=1");
  const evidence = page.locator("details[aria-label='Practice evidence']");
  await expect(evidence).toBeVisible();
  await expect(page.getByText("Est. readiness", { exact: false })).toHaveCount(0);
  await expect(evidence.locator("summary")).toContainText("Coverage");
  await expect(evidence.locator("summary")).toContainText("Mastery");
  await evidence.locator("summary").click();
  await expect(evidence).toContainText("Weighted by exam importance");
  await expect(evidence).toContainText("Limited question coverage");
  const before = await evidence.textContent();
  await page.reload();
  const afterReload = page.locator("details[aria-label='Practice evidence']");
  await expect(afterReload).toBeVisible();
  await afterReload.locator("summary").click();
  await expect(afterReload).toHaveText(before!);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(afterReload).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
