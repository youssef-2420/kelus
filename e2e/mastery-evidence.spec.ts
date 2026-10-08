import { test, expect } from "@playwright/test";

test("Today is one booklet page — topic title, no planner chrome", async ({ page }) => {
  await page.goto("/today?sample=1");
  await expect(page.locator("#today-title")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toHaveCount(0);
  await expect(page.getByText("Next", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Next stops", { exact: true })).toHaveCount(0);
  await expect(page.locator("details[aria-label='Practice evidence']")).toHaveCount(0);
  await expect(page.locator(".today-plan-list")).toHaveCount(0);
  await expect(page.locator(".today-evidence-disclosure")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Start this topic/ })).toBeVisible();
});

test("topic index and topic detail show the same derived practice mastery", async ({ page }) => {
  await page.goto("/today?sample=1");
  await page.getByRole("navigation", { name: "Revision sections" }).getByRole("button", { name: "Topics" }).click();
  const topic = page.locator(".index-toc-row").filter({ hasText: "Elasticity" });
  const indexMastery = (await topic.locator(".index-toc-meta").innerText()).match(/\d+%/)?.[0];
  expect(indexMastery).toBeTruthy();
  await topic.click();
  await expect(page.getByRole("heading", { name: "Elasticity" })).toBeVisible();
  await expect(page.getByTestId("topic-standing")).toContainText(indexMastery!);
});
