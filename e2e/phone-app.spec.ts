import { expect, test } from "@playwright/test";
import { playQuickRun, startFromPaste } from "./helpers";

const notes = "Cell biology\n\nOsmosis\nOsmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back.\n\nEnzymes\nEnzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate.";
const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, userAgent: iphone });

  test("the sections are a bottom tab bar, and switching them works", async ({ page }) => {
    await startFromPaste(page, notes);
    await page.goto("/today");
    const bar = page.getByRole("navigation", { name: "Sections" });
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(844);
    await bar.getByRole("button", { name: "Progress" }).click();
    await expect(page).toHaveURL(/section=progress/);
    await expect(bar.getByRole("button", { name: "Progress" })).toHaveAttribute("aria-current", "page");
  });

  test("on iPhone the install card shows Safari's two steps, and Not now hides it for good", async ({ page }) => {
    await startFromPaste(page, notes);
    await playQuickRun(page, "Water moves.", "Partly");
    await page.goto("/today");
    const card = page.getByRole("region", { name: "Put Kelus on your home screen" });
    await card.getByRole("button", { name: "Show me how" }).click();
    await expect(card.getByRole("list", { name: "Add to Home Screen in Safari" })).toContainText("Add to Home Screen");
    await card.getByRole("button", { name: "Done" }).click();
    await page.reload();
    await expect(page.getByRole("region", { name: "Put Kelus on your home screen" })).toHaveCount(0);
  });
});

test("where the browser offers an install prompt, the card's button opens it", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __prompted: boolean }).__prompted = false;
    window.addEventListener("load", () => {
      const event = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
      event.prompt = async () => { (window as unknown as { __prompted: boolean }).__prompted = true; };
      event.userChoice = Promise.resolve({ outcome: "accepted" });
      setTimeout(() => window.dispatchEvent(event), 300);
    });
  });
  await startFromPaste(page, notes);
  await playQuickRun(page, "Water moves.", "Partly");
  await page.goto("/today");
  await page.getByRole("region", { name: "Put Kelus on your home screen" }).getByRole("button", { name: "Install Kelus" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted)).toBe(true);
});
