import { expect, test } from "@playwright/test";

test("pricing opens from the homepage with the Plus accent and no stale homepage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Pricing" }).click();
  await expect(page.getByRole("heading", { name: "Start revising. Stay in control." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revise your lessons. Walk into the exam ready." })).toHaveCount(0);
  await expect(page.locator(".pricing-offer.is-pass")).toHaveCSS("background-color", "rgb(242, 237, 248)");
});

test("pricing plans zoom gently without losing mobile or reduced-motion usability", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("/pricing/");
  const plans = page.getByRole("listitem").filter({ has: page.locator(".pricing-offer") });
  await expect(plans).toHaveCount(2);

  const free = plans.first();
  await free.hover();
  await expect.poll(async () => Number((await free.evaluate((element) => getComputedStyle(element).transform)).match(/^matrix\(([^,]+)/)?.[1] ?? 1)).toBeGreaterThan(1.01);

  const start = free.getByRole("link", { name: /Start revising/ });
  const box = await start.boundingBox();
  if (!box) throw new Error("Free plan action is not visible");
  await page.mouse.move(box.x + 24, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => Number((await free.locator("article").evaluate((element) => getComputedStyle(element).transform)).match(/^matrix\(([^,]+)/)?.[1] ?? 1)).toBeLessThan(0.98);
  await page.mouse.up();

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/pricing/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.close();

  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto("/pricing/");
  const reducedFree = reduced.locator(".pricing-plan-shell").first();
  await reducedFree.hover();
  await expect(reducedFree).toHaveCSS("transform", "none");
  await reduced.close();
});
