import { expect, test } from "@playwright/test";
import { saveExamDate, playQuickRun, startFromPaste } from "./helpers";

const notes = "Osmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back. In a hypertonic solution the cell loses water and becomes plasmolysed.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate. High temperatures denature an enzyme because the active site changes shape.";

test("missed lines are saved with the learner state, so they sync with an account", async ({ page }) => {
  await startFromPaste(page, notes);
  await playQuickRun(page, "Water moves.", "Partly");
  const saved = await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      try { const value = JSON.parse(localStorage.getItem(key)!); if (value?.snapshot) return value.missedLines ?? null; } catch { /* not state */ }
    }
    return null;
  });
  expect(Array.isArray(saved) && saved.length > 0).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("kelus-missed-lines-v1"))).toBeNull();
});

test("nudges: asked from a click, then one calm line with time, test and off", async ({ page, context }) => {
  await context.grantPermissions(["notifications"], { origin: new URL(test.info().project.use.baseURL!).origin });
  await startFromPaste(page, notes);
  await playQuickRun(page, "Water moves.", "Partly");
  await page.goto("/today");
  await saveExamDate(page);
  const card = page.getByRole("region", { name: "A nudge when your warm-up is ready" });
  await expect(card).toBeVisible();
  await card.getByLabel("Nudge me at").selectOption("20:00");
  await card.getByRole("button", { name: "Turn on nudges" }).click();
  const on = page.getByRole("region", { name: "Nudges" });
  await expect(on).toContainText("Nudges on");
  await expect(on).toContainText("8:00");
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration("/")))).toBe(true);
  await on.getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByRole("region", { name: "A nudge when your warm-up is ready" })).toBeVisible();
});

test("two days later, after your time, the nudge fires once with the number of lines ready", async ({ page, context }) => {
  await context.grantPermissions(["notifications"], { origin: new URL(test.info().project.use.baseURL!).origin });
  // Headless Chromium will not display notifications, so the call itself is recorded: title, body, tag.
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { __nudges: string[] }).__nudges = calls;
    ServiceWorkerRegistration.prototype.showNotification = async function (title: string, options?: NotificationOptions) { calls.push(`${title} | ${options?.body} | ${options?.tag}`); };
  });
  await page.clock.install({ time: new Date("2026-10-06T10:00:00") });
  await startFromPaste(page, notes);
  await playQuickRun(page, "Water moves.", "Partly");
  await page.goto("/today");
  await saveExamDate(page);
  await page.getByRole("button", { name: "Turn on nudges" }).click();
  await expect(page.getByRole("region", { name: "Nudges" })).toContainText("Nudges on");

  await page.clock.setSystemTime(new Date("2026-10-08T18:30:00"));
  await page.clock.resume();
  await page.goto("/today");
  const shown = async () => page.evaluate(() => (window as unknown as { __nudges: string[] }).__nudges.filter((call) => call.endsWith("kelus-warmup")));
  await expect.poll(shown, { timeout: 15_000 }).toHaveLength(1);
  expect((await shown())[0]).toMatch(/^Your 1-minute warm-up is ready \| (One line|\d lines) you missed .* \| kelus-warmup$/);

  // Never twice on the same day: a fresh page load the same evening sends nothing.
  await page.goto("/today");
  await page.waitForTimeout(2000);
  expect(await shown()).toHaveLength(0);
});
