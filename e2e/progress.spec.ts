import { expect, test, type Page } from "@playwright/test";
import { closeToToday, startFromPaste } from "./helpers";

const notes = `# Osmosis
Osmosis is the movement of water across a selectively permeable membrane from a region of low solute concentration to a region of high solute concentration. Water moves toward the side with more solute because the solute lowers the water potential there.

# Enzymes
Enzymes are biological catalysts, almost always proteins, that speed up reactions by lowering the activation energy. Each enzyme has an active site whose shape fits a specific substrate, which is why enzymes are specific.

# Active transport
Active transport moves substances across a membrane against their concentration gradient, from low to high concentration, and it requires energy in the form of ATP.`;

async function newCourse(page: Page) {
  await startFromPaste(page, notes);
  await closeToToday(page);
}

async function playRun(page: Page) {
  for (let guard = 0; guard < 6; guard += 1) {
    await expect(page.locator('#run-explain, input[id^="run-gap"]:not([disabled]), [role="group"][aria-label="Choose one"] button:not([disabled])').first()).toBeVisible();
    if (await page.locator("#run-explain").count()) break;
    const gap = page.locator('input[id^="run-gap"]:not([disabled])');
    if (await gap.count()) { await gap.fill("zzz"); await page.getByRole("button", { name: "Check", exact: true }).click(); }
    else await page.getByRole("group", { name: "Choose one" }).getByRole("button").first().click();
    await page.getByRole("button", { name: /^(Next|Now say it yourself)/ }).click();
  }
  await page.locator("#run-explain").fill("It moves water toward more solute.");
  await page.getByRole("button", { name: /Compare with the page/ }).click();
  await page.getByRole("button", { name: /Nailed it/ }).click();
}

test("a brand-new course says it is too early instead of inventing a trend", async ({ page }) => {
  await newCourse(page);
  await page.getByRole("navigation", { name: "Revision sections" }).getByRole("button", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { name: "Progress", level: 1 })).toBeVisible();
  await expect(page.locator("#progress-headline")).toContainText("Too early to say. Answer 6 more topic checks");
  await expect(page.getByText("Nothing is estimated until you answer.", { exact: false })).toBeVisible();
  await expect(page.getByRole("img", { name: /Estimated readiness over 14 days/ })).toHaveCount(0); // no chart yet
  await expect(page.getByRole("region", { name: "Not started" })).toContainText("Osmosis");
  await expect(page.getByRole("link", { name: /Practise a topic/ })).toBeVisible();
});

test("after answering, the screen counts the answers but still does not claim a trend from one topic", async ({ page }) => {
  await newCourse(page);
  await page.locator('button[data-action="start-topic"]').click();
  await playRun(page);
  await page.goto("/today?section=progress");
  await expect(page.locator("#progress-headline")).toContainText("Too early to say");
  await expect(page.getByText(/\d+ answers? so far\. Kelus draws a trend once there are 6/)).toBeVisible();
  const answers = page.locator("dl").getByText("Answers", { exact: true }).locator("xpath=..").locator("dd");
  await expect(answers).not.toHaveText("0");
  // Osmosis was answered; "Not started" lists only the rest, and disappears once every topic has an answer.
  const notStarted = page.getByRole("region", { name: "Not started" });
  if (await notStarted.count()) await expect(notStarted).not.toContainText("Osmosis");
});

test("the sample course has history, so it shows a real trend with a chart and a pace line", async ({ page }) => {
  await page.goto("/today?sample=1");
  await page.getByRole("navigation", { name: "Revision sections" }).getByRole("button", { name: "Progress" }).click();
  await expect(page.locator("#progress-headline")).not.toContainText("Too early");
  await expect(page.getByRole("img", { name: /Estimated readiness over 14 days/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Pace to your target" })).toContainText("a day");
  // A topic is in one list only.
  const stronger = await page.getByRole("region", { name: "Got stronger" }).locator("li strong").allInnerTexts();
  const needs = await page.getByRole("region", { name: "Needs another pass" }).locator("li strong").allInnerTexts();
  for (const name of stronger) expect(needs).not.toContain(name);
});

test("Progress is one click from Today, in the sections", async ({ page }) => {
  await newCourse(page);
  await page.locator('nav[aria-label="Revision sections"]').getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page).toHaveURL(/section=progress/);
  await expect(page.locator("#progress-headline")).toBeVisible();
});
