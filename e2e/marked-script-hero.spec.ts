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
    await expect(hero.getByRole("link", { name: "Try sample" })).toHaveAttribute("href", /^\/today\/?\?sample=1$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

