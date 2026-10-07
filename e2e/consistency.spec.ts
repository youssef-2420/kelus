import { expect, test } from "@playwright/test";
import { startFromPaste } from "./helpers";

const notes = "Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back. In a hypertonic solution the cell loses water and becomes plasmolysed.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate. High temperatures denature an enzyme because the active site changes shape.";

test("the result card, Today and Topics all name the same next topic, and a pasted title names the course", async ({ page }) => {
  await startFromPaste(page, notes);
  for (let i = 0; i < 5; i++) {
    await page.locator('#run-explain, button:has-text("I’m not sure")').first().waitFor();
    if (await page.locator("#run-explain").count()) break;
    await page.getByRole("button", { name: "I’m not sure" }).click();
    await page.getByRole("button", { name: /^(Next|Now say)/ }).click();
  }
  await page.getByRole("button", { name: "I don’t remember" }).click();
  await page.getByRole("button", { name: /Missed it/ }).click();
  const next = ((await page.getByRole("button", { name: /^Continue to / }).innerText()).match(/Continue to (.+?)\s*→?$/) ?? [])[1]?.trim();
  expect(next).toBeTruthy();

  await page.goto("/today");
  await expect(page.locator("#today-title")).toHaveText(next!);
  await expect(page.locator(".studio-topbar-course")).toHaveText("Cell biology");
  await expect(page.getByLabel("Why this topic is first")).not.toContainText("exam is close");

  await page.goto("/today?section=map");
  await expect(page.locator(".index-toc-row").first()).toContainText(next!);
  await expect(page.locator(".index-toc-row").first()).toContainText("Start here");
});
