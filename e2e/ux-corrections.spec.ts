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

test("sample route explains its actual outcome and total", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Interactive sample", { exact: true })).toBeVisible();
  const diagram = page.getByRole("img", { name: /Marked script/ });
  await expect(diagram.locator(":scope > g")).toHaveAttribute("aria-hidden", "true");
  const reveal = page.getByRole("button", { name: "Reveal answer" });
  await expect(page.locator("#board-answer")).toHaveCount(1);
  await expect(page.locator("#board-answer")).toBeHidden();
  expect((await reveal.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await reveal.click();
  await page.getByRole("button", { name: "I remembered", exact: true }).click();
  await expect(page.locator(".booklet-flow-route-title")).toContainText("39 min");
  await page.getByRole("button", { name: "Hide answer" }).click();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "I was shaky" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Elasticity stays first" })).toBeVisible();
  await expect(page.locator(".booklet-flow-route-title")).toContainText("45 min");
});

test("course examples use ordinary keyboard-operable buttons", async ({ page }) => {
  await page.goto("/route/");
  const group = page.getByRole("group", { name: "Example course", exact: true });
  const history = group.getByRole("button", { name: "History", exact: true });
  await history.focus();
  await page.keyboard.press("Enter");
  await expect(history).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tablist")).toHaveCount(0);
});

test("mobile Today keeps navigation compact and a single start action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today/?sample=1");
  await expect(page.getByRole("navigation", { name: "Revision sections" })).toBeVisible();
  const boxes = await page.locator(".kelus-space-nav button").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(2);
  await expect(page.locator(".kelus-space-start")).toBeHidden();
  await expect(page.getByRole("button", { name: /Start Elasticity/ })).toBeVisible();
  await expect(page.locator("#today-title")).toHaveText(/Elasticity/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toHaveCount(0);
  await expect(page.locator("details[aria-label='Practice evidence']")).toHaveCount(0);
  await expect(page.getByText("Next stops", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
