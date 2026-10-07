import { expect, test } from "@playwright/test";
import { startFromPaste } from "./helpers";

const notes = "Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back. In a hypertonic solution the cell loses water and becomes plasmolysed.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate. High temperatures denature an enzyme because the active site changes shape.\n\nDiffusion\nDiffusion is the net movement of particles from an area of higher concentration to an area of lower concentration. It is a passive process, so it needs no energy from the cell. The rate of diffusion increases with a steeper concentration gradient.";

test("a whole block runs from the first question to the end with no stop between topics, and ends on each topic's outcome", async ({ page }) => {
  test.setTimeout(120_000);
  await startFromPaste(page, notes);
  const seen: string[] = [];
  for (let topic = 0; topic < 6; topic++) {
    seen.push(await page.locator(".study-context-title small b").innerText());
    for (let step = 0; step < 6; step++) {
      await page.locator('#run-explain, button:has-text("I’m not sure")').first().waitFor();
      if (await page.locator("#run-explain").count()) break;
      await page.getByRole("button", { name: "I’m not sure" }).click();
      await page.getByRole("button", { name: /^(Next|Now say)/ }).click();
    }
    await page.getByRole("button", { name: "I don’t remember" }).click();
    await page.getByRole("button", { name: /Partly/ }).click();
    const next = page.getByRole("button", { name: /^Continue to / });
    await next.or(page.getByRole("button", { name: /Finish block/ })).first().waitFor();
    if (!(await next.count())) break;
    await next.click();
    // Straight into the next topic: no "Updated." route screen in between.
    await expect(page.getByRole("heading", { name: "Updated." })).toHaveCount(0);
    await page.locator('#run-explain, button:has-text("I’m not sure")').first().waitFor();
  }
  await page.getByRole("button", { name: /Finish block/ }).click();
  await expect(page).toHaveURL(/\/session\/complete/);
  const list = page.getByRole("list", { name: "Topics in this block" });
  await expect(list.locator("li")).toHaveCount(seen.length);
  for (const name of seen) await expect(list).toContainText(name);
  await expect(list).toContainText("Needs another attempt"); // every check unsure and nothing remembered: honest, not flattering
  await expect(page.getByText(/Holding steady|The useful change|Did this help you decide/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Back to Today/ })).toBeVisible();
});
