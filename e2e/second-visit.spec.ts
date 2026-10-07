import { expect, test } from "@playwright/test";
import { playQuickRun, startFromPaste } from "./helpers";

const notes = "Osmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back. In a hypertonic solution the cell loses water and becomes plasmolysed. Animal cells have no cell wall, so in a hypotonic solution they may burst.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate. High temperatures denature an enzyme because the active site changes shape.";

test("the second visit opens with what you missed, warms up on it, then goes on to the next topic", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-06T10:00:00") });
  await startFromPaste(page, notes);
  await playQuickRun(page, "Water moves across a membrane.", "Partly");
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toHaveCount(0);

  // Two days later.
  await page.clock.setSystemTime(new Date("2026-10-08T18:30:00"));
  await page.goto("/today");
  const card = page.getByRole("region", { name: "Welcome back." });
  await expect(card).toContainText("Good evening.");
  await expect(card).toContainText("It’s been 2 days.");
  await expect(card).toContainText("Last time: Osmosis");
  await expect(card.getByRole("list", { name: "Lines to warm up on" }).locator("li").first()).toBeVisible();
  await expect(page.locator('[data-action="start-topic"]')).toBeVisible();

  await card.getByRole("link", { name: /Start the 1-minute warm-up/ }).click();
  await expect(page).toHaveURL(/\/session\/warmup/);
  await expect(page.getByText("Warm-up · lines you missed last time")).toBeVisible();
  for (let guard = 0; guard < 4; guard += 1) {
    await expect(page.getByRole("button", { name: "I’m not sure" }).or(page.getByRole("heading", { name: /came back|Not yet/ }))).toBeVisible();
    if (await page.getByRole("heading", { name: /came back|Not yet/ }).count()) break;
    await page.getByRole("button", { name: "I’m not sure" }).click();
    await page.getByRole("button", { name: /^(Next|See how it went)/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Not yet. That’s what warm-ups are for." })).toBeVisible();
  await page.getByRole("button", { name: /^Continue to / }).click();
  await expect(page).toHaveURL(/\/session/, { timeout: 15_000 });
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
});
