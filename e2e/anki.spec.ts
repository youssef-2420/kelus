import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { startFromPaste } from "./helpers";

test("Topics exports every question as an Anki import file", async ({ page }) => {
  await startFromPaste(page, "Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate.");
  await page.goto("/today?section=map");
  const card = page.getByRole("region", { name: "Take your cards to Anki" });
  const download = page.waitForEvent("download");
  await card.getByRole("button", { name: "Export for Anki" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Cell biology – Anki.txt");
  const text = readFileSync(await file.path(), "utf8");
  expect(text).toContain("#deck:Kelus::Cell biology");
  expect(text).toContain("Osmosis");
  await expect(card.getByRole("status")).toContainText("File → Import");
});
