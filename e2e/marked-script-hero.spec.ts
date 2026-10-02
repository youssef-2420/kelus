import { expect, test } from "@playwright/test";

test("revision-sheet hero preserves copy, links, and narrow-screen layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [320, 375, 414, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const hero = page.locator('[data-hero="marked-script"]');
    await expect(hero.locator("h1")).toHaveText("Revise your lessons. Walk into the exam ready.");
    await expect(hero.getByRole("link", { name: "Set up" })).toHaveAttribute("href", /^\/today\/?$/);
    await expect(hero.getByRole("link", { name: "Try sample (~1 min)" })).toHaveCount(0);
    await expect(hero.getByRole("img", { name: /Illustrative Microeconomics study sheet/ })).toBeVisible();
    await expect(hero.locator("figure")).toContainText("Elasticity moves to the top of the route");
    const sheet = await hero.locator("figure").boundingBox();
    expect(sheet).not.toBeNull();
    expect(sheet!.x).toBeGreaterThanOrEqual(0);
    expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("Set up and sample revision open the course workspace without a cover image", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-hero="marked-script"]').getByRole("link", { name: "Set up" }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(page.locator(".studio-rail")).toBeVisible();
  await expect(page.locator(".studio-cover")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Set your exam" })).toBeVisible();
  await expect(page.locator(".studio-onboarding-steps [aria-current='step']")).toContainText("Exam");
  await page.goto("/today/?sample=1");
  await expect(page.locator(".studio-cover")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Elasticity" })).toBeVisible();
});

test("the first section lets visitors try a pass and continue into a current sample course", async ({ page }) => {
  await page.goto("/");
  // The hands-on proof follows the marked-script hero, before explanatory chapters.
  await expect(page.locator("main > section").nth(1)).toHaveAttribute("id", "try");
  const sample = page.locator("#try");
  await sample.getByRole("button", { name: "Reveal answer" }).click();
  await sample.getByRole("button", { name: "I remembered" }).click();
  await expect(sample.getByText("Supply & Demand", { exact: true })).toBeVisible();
  await sample.getByRole("link", { name: "Open the sample course" }).click();
  await expect(page.getByText("Sample course", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".studio-course")).not.toContainText("0 days until exam");
});

test("hero is readable immediately and does not hold navigation for an animation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const hero = page.locator('[data-hero="marked-script"]');
  await expect(hero.locator("figure")).toContainText("Close substitutes make demand");
  await expect(hero.locator("figure")).toContainText("Try to recall");
  await expect(hero.locator("[data-ink]")).toHaveCount(0);
  await expect(hero.getByRole("link", { name: "Set up" })).toBeEnabled();
});

test("reduced motion presents the same finished sheet without hydration errors", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const hero = page.locator('[data-hero="marked-script"]');
  await expect(hero.locator("figure")).toContainText("Elasticity moves to the top of the route");
  await expect(hero.locator("button")).toHaveCount(0);
  await expect(hero.locator("[data-ink]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
