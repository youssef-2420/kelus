import { expect, test } from "@playwright/test";
import { playQuickRun, startFromPaste } from "./helpers";

const notes = `# Osmosis
Osmosis is the movement of water across a selectively permeable membrane from a region of low solute concentration to a region of high solute concentration. Water moves toward the side with more solute because the solute lowers the water potential there.

# Enzymes
Enzymes are biological catalysts, almost always proteins, that speed up reactions by lowering the activation energy. Each enzyme has an active site whose shape fits a specific substrate, which is why enzymes are specific.`;

test("the result is one visual card: verdict, checks as dots, what to remember, today's goal, one next step", async ({ page }) => {
  await startFromPaste(page, notes);
  await playQuickRun(page, "It moves water toward more solute.", "Nailed it");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Solid pass|Partly there|Needs another attempt)\.$/);
  await expect(page.getByText("Quick checks", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /\d of \d checks right/ })).toBeVisible();
  await expect(page.getByText("You said", { exact: true })).toBeVisible();
  await expect(page.getByText(/^(?:Worth remembering|Worth another look|One more line from your notes)/)).toBeVisible();
  await expect(page.getByLabel(/Today: \d of \d topics/)).toBeVisible();

  // The next step is on screen without scrolling, on a phone too.
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 780 }]) {
    await page.setViewportSize(viewport);
    const next = page.getByRole("button", { name: /^Continue to /i });
    await expect(next).toBeVisible();
    const box = await next.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  }

  // The detail is one tap away, not in your face.
  await expect(page.getByText("What changed in your plan")).toBeVisible();
  await expect(page.getByLabel("What changed in this session")).toBeHidden();
  await page.getByText("What changed in your plan").click();
  await expect(page.getByLabel("What changed in this session")).toBeVisible();
});
