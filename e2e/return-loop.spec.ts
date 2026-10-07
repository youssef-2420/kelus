import { expect, test, type Page } from "@playwright/test";

async function playQuickRun(page: Page) {
  for (let guard = 0; guard < 6; guard += 1) {
    await expect(page.locator('#run-explain, input[id^="run-gap"]:not([disabled]), [role="group"][aria-label="Choose one"] button:not([disabled])').first()).toBeVisible();
    if (await page.locator("#run-explain").count()) break;
    const gap = page.locator('input[id^="run-gap"]:not([disabled])');
    if (await gap.count()) {
      await gap.fill("zzz");
      await page.getByRole("button", { name: "Check", exact: true }).click();
    } else {
      await page.getByRole("group", { name: "Choose one" }).getByRole("button").first().click();
    }
    await page.getByRole("button", { name: /^(Next|Now say it yourself)/ }).click();
  }
  await page.locator("#run-explain").fill("It depends on how easily buyers can switch.");
  await page.getByRole("button", { name: /Compare with the page/ }).click();
  await page.getByRole("button", { name: /Nailed it/ }).click();
}

test("answering a topic starts a streak and moves today's goal", async ({ page }) => {
  await page.goto("/today?sample=1");
  const strip = page.getByRole("region", { name: "Your study habit" });
  await expect(strip).toContainText("0 of 3 topics");
  // The sample comes with earlier practice, so it is a new streak, not a first one.
  await expect(strip).toContainText("Answer one topic today to start a new streak.");

  await page.getByRole("button", { name: /Start this topic/ }).click();
  await playQuickRun(page);

  await page.goto("/today");
  await expect(strip).toContainText("1-day streak");
  await expect(strip).toContainText("1 of 3 topics");
  await expect(strip).toContainText("2 more to reach today’s goal.");
  await expect(strip.getByRole("progressbar", { name: "Today’s goal" })).toHaveAttribute("aria-valuenow", "1");
  await expect(strip.getByRole("list", { name: "Last seven days" }).locator("li")).toHaveCount(7);
});
