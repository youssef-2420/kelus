import { expect, test, type Page } from "@playwright/test";
import { gotoStart } from "./helpers";

const axePath = "node_modules/axe-core/axe.min.js";

async function violations(page: Page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (c: object) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: string[] }> }> }> } }).axe.run({ runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] });
    return result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`);
  });
}

test("the homepage has no WCAG A/AA violations once its sections have appeared", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  for (let y = 0; y < 9000; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); }
  await page.waitForTimeout(2500);
  expect(await violations(page)).toEqual([]);
});

test("the privacy page, the start screen and the pricing page have no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/privacy/", { waitUntil: "networkidle" });
  expect(await violations(page)).toEqual([]);
  await page.goto("/pricing/", { waitUntil: "networkidle" });
  expect(await violations(page)).toEqual([]);
  await gotoStart(page);
  expect(await violations(page)).toEqual([]);
});
