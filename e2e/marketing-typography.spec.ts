import { test, expect } from "@playwright/test";

test("editorial fonts stay on marketing headings and leave the app unchanged", async ({ page }) => {
  for (const [path, heading] of [["/", "#home-hero-title"], ["/route/", "#how-title"], ["/pricing/", ".pricing-page h1"]]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(heading)).toHaveCSS("font-family", /Fraunces/i);
    await expect(page.locator('[data-marketing] p').first()).toHaveCSS("font-family", /Inter/i);
    await expect(page.locator('.site-header a').first()).toHaveCSS("font-family", /Inter/i);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.goto("/");
  await page.locator('#home-hero-title').waitFor();
  await page.getByRole("link", { name: "Set my exam" }).first().click();
  await expect(page.locator('[data-marketing]')).toHaveCount(0);
  await expect(page.locator('h1').first()).not.toHaveCSS("font-family", /Fraunces/i);
  await expect(page.locator('.site-header a').first()).toHaveCSS("font-family", /Plex/i);
});
