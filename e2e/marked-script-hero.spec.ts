import { expect, test } from "@playwright/test";

test("marked script preserves copy, links, and narrow-screen layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [320, 375, 414, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const hero = page.locator('[data-hero="marked-script"]');
    await expect(hero.locator("h1")).toHaveText("Revise your lessons. Walk into the exam ready.");
    await expect(hero.getByRole("link", { name: "Set my exam" })).toHaveAttribute("href", /^\/today\/?$/);
    await expect(hero.getByRole("link", { name: "Try sample (~1 min)" })).toHaveAttribute("href", /^\/today\/?\?sample=1$/);
    await expect(hero.locator("svg text").filter({ hasText: /^Start here$/ })).toHaveCount(1);
    const start = await hero.locator("[data-start-note] text").boundingBox();
    expect(start).not.toBeNull();
    expect(start!.x).toBeGreaterThanOrEqual(0);
    expect(start!.x + start!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("ink draws without blocking navigation, and finishes on its own", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const hero = page.locator('[data-hero="marked-script"]');
  await expect(hero.locator("figure")).toHaveAttribute("data-drawing", "drawing");
  await expect(hero.getByRole("button", { name: /Pause ink|Resume ink|Replay ink/ })).toHaveCount(0);
  const lastInk = hero.locator('[data-ink="3"]');
  expect(await lastInk.evaluate(element => parseFloat(getComputedStyle(element).strokeDashoffset))).toBeGreaterThan(.3);
  await expect(hero.getByRole("link", { name: "Set my exam" })).toBeEnabled();
  await expect(hero.locator('[data-ink="0"]')).toHaveCSS("stroke-dashoffset", "0px", { timeout: 15000 });
  await expect.poll(() => hero.locator("[data-start-wash]").evaluate(element => parseFloat(getComputedStyle(element).opacity))).toBeGreaterThan(.12);
  await expect(hero.locator("figure")).toHaveAttribute("data-drawing", "finished", { timeout: 20000 });
  await expect(lastInk).toHaveCSS("stroke-dashoffset", "0px");
});

test("reduced motion presents the finished script without hydration errors", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const hero = page.locator('[data-hero="marked-script"]');
  await expect(hero.locator("figure")).toHaveAttribute("data-drawing", "static");
  await expect(hero.locator("button")).toHaveCount(0);
  for (const ink of await hero.locator("[data-ink]").all()) {
    await expect(ink).toHaveCSS("stroke-dashoffset", "0px");
  }
  expect(errors).toEqual([]);
});
