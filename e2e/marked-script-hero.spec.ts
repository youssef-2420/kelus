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
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("ink can pause, finish, and replay without blocking navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const hero = page.locator('[data-hero="marked-script"]');
  await hero.getByRole("button", { name: "Pause ink" }).click();
  await expect(hero.locator("figure")).toHaveAttribute("data-drawing", "paused");
  await expect(hero.getByRole("link", { name: "Set my exam" })).toBeEnabled();
  await hero.getByRole("button", { name: "Resume ink" }).click();
  await expect(hero.getByRole("button", { name: "Replay ink" })).toBeVisible({ timeout: 15000 });
  await hero.getByRole("button", { name: "Replay ink" }).click();
  await expect(hero.getByRole("button", { name: "Pause ink" })).toBeVisible();
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
