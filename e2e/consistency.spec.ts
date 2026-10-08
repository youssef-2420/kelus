import { expect, test } from "@playwright/test";
import { startBuiltPlan, startFromPaste } from "./helpers";

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

test("a file with no study topics never names the course; the first real notes do", async ({ page }) => {
  const certificate = "# Attestation de stage\n\nNous soussignés, la société Exemple SARL, certifions que Monsieur Dupont a effectué un stage au sein de notre entreprise du 1er juillet au 31 août. Fait pour servir et valoir ce que de droit.";
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles({ name: "Attestation de stage.md", mimeType: "text/markdown", buffer: Buffer.from(certificate) });
  await page.getByRole("button", { name: /Try another file/ }).click();
  await expect(page.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
  await expect(page.getByText(/Attestation/)).toHaveCount(0);

  await page.getByText("Or paste your notes").click();
  await page.locator("#paste-notes").fill("Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate.");
  await page.getByRole("button", { name: "Use these notes" }).click();
  await startBuiltPlan(page);
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await page.goto("/today");
  await expect(page.locator(".studio-topbar-course")).toHaveText("Cell biology");
});

test("a course still named after a file with no topics takes the name of the notes its topics come from", async ({ page }) => {
  await page.goto("/today", { waitUntil: "networkidle" });
  await page.getByText("Or paste your notes").click();
  await page.locator("#paste-notes").fill("Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate.");
  await page.getByRole("button", { name: "Use these notes" }).click();
  await startBuiltPlan(page);
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  // The state an older version left behind.
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      const value = JSON.parse(localStorage.getItem(key) ?? "null");
      if (value?.snapshot?.courses) { value.snapshot.courses[0].name = "Attestation de stage"; delete value.snapshot.courses[0].nameSource; localStorage.setItem(key, JSON.stringify(value)); }
    }
  });
  await page.goto("/today");
  await expect(page.locator(".studio-topbar-course")).toHaveText("Cell biology");
});
