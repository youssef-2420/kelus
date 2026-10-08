import { expect, test } from "@playwright/test";
import { startFromPaste, topicNames } from "./helpers";

const notes = "Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate.\n\nDiffusion\nDiffusion is the net movement of particles from an area of higher concentration to an area of lower concentration. It is a passive process, so it needs no energy from the cell.";

test("you can just type the answer and press Enter, then Enter again for the next check", async ({ page }) => {
  await startFromPaste(page, notes);
  for (let i = 0; i < 4; i++) {
    if (await page.locator('input[id^="run-gap"]:not([disabled])').count()) break;
    await page.getByRole("button", { name: "I’m not sure" }).click();
    await page.getByRole("button", { name: /^(Next|Now say)/ }).click();
    await page.locator('#run-explain, button:has-text("I’m not sure")').first().waitFor();
  }
  test.skip(!(await page.locator('input[id^="run-gap"]:not([disabled])').count()), "no gap question in this run");
  await page.keyboard.type("water");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^(Next|Now say)/ })).toBeFocused();
});

test("Back returns to the section you came from", async ({ page }) => {
  await startFromPaste(page, notes);
  await page.goto("/today");
  const nav = page.locator('nav[aria-label="Revision sections"]');
  await nav.getByRole("button", { name: "Topics", exact: true }).click();
  await expect(page).toHaveURL(/section=map/);
  await nav.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page).toHaveURL(/section=progress/);
  await page.goBack();
  await expect(page).toHaveURL(/section=map/);
  await page.locator(".index-toc-row").first().click();
  await expect(page).toHaveURL(/\/concept/);
  await page.goBack();
  await expect(page).toHaveURL(/section=map/);
});

test("the course and a topic are renamed where they stand, and a removed topic comes back with Undo", async ({ page }) => {
  await startFromPaste(page, notes);
  await page.goto("/today");
  await page.getByRole("button", { name: /Rename course/ }).click();
  await page.getByRole("textbox", { name: "Rename course" }).fill("Biology mock exam");
  await page.keyboard.press("Enter");
  await expect(page.locator(".studio-topbar-course")).toHaveText("Biology mock exam");

  await page.goto("/today?section=map");
  await page.locator(".index-toc-row").filter({ hasText: "Diffusion" }).click();
  await page.getByRole("button", { name: /Rename topic/ }).click();
  await page.getByRole("textbox", { name: "Rename topic" }).fill("Diffusion and gradients");
  await page.keyboard.press("Enter");
  expect(await topicNames(page)).toContain("Diffusion and gradients");

  await page.goto("/today");
  await page.locator('[data-action="start-topic"]').click();
  const name = await page.locator(".study-context-title small b").innerText();
  await page.getByRole("button", { name: "More session options" }).click();
  await page.getByRole("button", { name: "Remove this topic" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  expect(await topicNames(page)).toContain(name);
});
