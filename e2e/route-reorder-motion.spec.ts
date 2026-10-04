import { expect, test } from "@playwright/test";

test("How it works shows one source-backed route change and can replay it", async ({ page }) => {
  await page.goto("/route/");
  const promoted = page.locator('[data-route-row="promoted"]');
  const previous = page.locator('[data-route-row="previous"]');
  const replay = page.getByRole("button", { name: "Replay how the study route changes" });

  await replay.scrollIntoViewIfNeeded();
  await expect(promoted).toHaveAttribute("style", /translateY\(-69px\)/);
  await expect(previous).toHaveAttribute("style", /translateY\(69px\)/);

  await replay.click();
  await expect(promoted).toHaveAttribute("style", /translateY\(-[0-9](?:\.\d+)?px\)|transform: none/);
  await expect(promoted).toHaveAttribute("style", /translateY\(-69px\)/);
  await expect(page.getByText("Elasticity moves ahead of Supply & Demand for another attempt.")).toBeVisible();
});

test("reduced motion presents the finished route without a replay control", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/route/");
  await expect(page.locator('[data-route-row="promoted"]')).toHaveAttribute("style", /translateY\(-69px\)/);
  await expect(page.getByRole("button", { name: "Replay how the study route changes" })).toHaveCount(0);
});
