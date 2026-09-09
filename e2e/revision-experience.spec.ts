import { expect, test } from "@playwright/test";

test("hero recall preview reveals, reorders, resets, and works on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Revise your lessons");

  const demo = page.locator(".hero-product-demo");
  await demo.scrollIntoViewIfNeeded();
  const preview = demo.getByRole("region", { name: "Try a revision question" });

  await expect(preview.getByText("Water moves by osmosis", { exact: false })).toHaveCount(0);
  await preview.getByRole("button", { name: "Reveal answer" }).click();
  await expect(preview.getByText("Water moves by osmosis", { exact: false })).toBeVisible();
  await preview.getByRole("button", { name: "I remembered it" }).click();
  await expect(demo.locator(".hero-demo-route li").first()).toContainText("Cell respiration");
  await demo.getByRole("button", { name: "Computer science", exact: true }).click();
  await expect(preview.getByRole("heading")).toContainText("hash table");
  await expect(preview.getByRole("button", { name: "Reveal answer" })).toHaveAttribute("aria-expanded", "false");
  await demo.getByRole("button", { name: "Reset example" }).click();
  await expect(demo.locator(".hero-demo-route li").first()).toContainText("Hash tables");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a direct completion URL never invents a completed session", async ({ page }) => {
  await page.goto("/session/complete?id=missing-session");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No completed session here yet.");
  await expect(page.getByRole("link", { name: "Back to Today" })).toBeVisible();
  await expect(page.getByText("estimated readiness", { exact: true })).toHaveCount(0);
});

test("the learning story stays continuous at every supported mobile width", async ({ page }) => {
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/route");
    const stages = page.locator(".how-loop > ol > li");
    await expect(stages).toHaveCount(6);
    for (const stage of await stages.all()) {
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toBeVisible();
      await expect(stage.getByRole("heading", { level: 2 })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
