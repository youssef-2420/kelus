import { sectionsNav } from "./helpers";
import { test, expect } from "@playwright/test";

test("marketing navigation and footer have clean semantics on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/route/", "/pricing/"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(nav.getByRole("link", { name: "How it works", exact: true })).toHaveText("How it works");
    await expect(nav.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.locator("main .site-footer")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("homepage explains the revision loop without the duplicate sample board", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Interactive sample", { exact: true })).toHaveCount(0);
  await expect(page.locator(".booklet-board")).toHaveCount(0);
  await expect(page.getByRole("group", { name: /Sample Microeconomics study sheet/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your notes become the next move." })).toBeVisible();
});

test("How it works keeps the steps without a redundant course chooser", async ({ page }) => {
  await page.goto("/route/");
  await expect(page.getByRole("group", { name: "Choose an example course" })).toHaveCount(0);
  await expect(page.locator('section[class*="story"] ol > li')).toHaveCount(3);
  await expect(page.getByRole("tablist")).toHaveCount(0);
});

test("mobile Today keeps navigation compact and a single start action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/?sample=1");
  await expect(sectionsNav(page)).toBeVisible();
  const boxes = await page.locator(".kelus-space-nav button").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(2);
  await expect(page.locator(".kelus-space-start")).toBeHidden();
  await expect(page.getByRole("button", { name: /Start this topic/ })).toBeVisible();
  await expect(page.locator("#today-title")).toHaveText(/Elasticity/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toHaveCount(0);
  await expect(page.locator("details[aria-label='Practice evidence']")).toHaveCount(0);
  await expect(page.getByText("Next stops", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
