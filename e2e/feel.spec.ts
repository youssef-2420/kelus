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
  const name = await page.locator(".study-topic-kicker b").innerText();
  await page.getByRole("button", { name: "More session options" }).click();
  await page.getByRole("button", { name: "Remove this topic" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  expect(await topicNames(page)).toContain(name);
});

test("⌘K finds a topic by a few letters and opens it; the sidebar's Search opens the same box", async ({ page }) => {
  await startFromPaste(page, notes);
  await page.goto("/today");
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("dialog", { name: "Search your course" });
  await expect(box).toBeVisible();
  await page.keyboard.type("enz");
  await expect(box.getByRole("option").first()).toContainText("Enzymes");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/concept/);
  await expect(page.getByRole("button", { name: /Rename topic/ })).toContainText("Enzymes");
  await page.goto("/today");
  await page.getByRole("button", { name: /^Search/ }).click();
  await expect(box).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(box).toHaveCount(0);
});

test("⌘Z puts back a removed topic, the same as the toast's Undo", async ({ page }) => {
  await startFromPaste(page, notes);
  await page.goto("/today");
  await page.locator('[data-action="start-topic"]').click();
  const name = await page.locator(".study-topic-kicker b").innerText();
  await page.getByRole("button", { name: "More session options" }).click();
  await page.getByRole("button", { name: "Remove this topic" }).click();
  await expect(page).toHaveURL(/\/today/);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText(`Put back “${name}”`)).toBeVisible();
  expect(await topicNames(page)).toContain(name);
});

test("a section is on screen at once: no waiting for the old one to fade out", async ({ page }) => {
  await startFromPaste(page, notes);
  await page.goto("/today");
  await page.locator('nav[aria-label="Revision sections"]').waitFor();
  // Watch every frame from the click: the first frame with the new section must already show it (no fade up from
  // nothing), and the old section must never sit on screen beside it while it leaves.
  const seen = await page.evaluate(() => new Promise<{ opacity: number; panels: number }>((resolve) => {
    document.querySelector<HTMLButtonElement>('nav[aria-label="Revision sections"] button[data-mode="map"]')!.click();
    const tick = () => {
      const row = document.querySelector(".revision-surface-panel .index-toc-row");
      if (row) resolve({ opacity: Number(getComputedStyle(row.closest(".revision-surface-panel")!).opacity), panels: document.querySelectorAll(".revision-surface-panel").length });
      else requestAnimationFrame(tick);
    };
    tick();
  }));
  expect(seen.panels).toBe(1);
  expect(seen.opacity).toBeGreaterThanOrEqual(0.5);
});
