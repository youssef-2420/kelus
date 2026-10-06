import { expect, test } from "@playwright/test";

test("the homepage offers a sample that runs the real loop without setup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Try a one-minute sample" }).click();
  await expect(page).toHaveURL(/\/try\/?$/);

  for (let check = 1; check <= 3; check += 1) {
    await expect(page.getByText(`Check ${check} of 3`)).toBeVisible();
    const choice = page.locator("button[class*=choice]:not([disabled])").first();
    if (await choice.count()) await choice.click();
    else {
      await page.locator('input[id^="run-gap"]:not([disabled])').fill("switch");
      await page.getByRole("button", { name: "Check", exact: true }).click();
    }
    await page.getByRole("button", { name: /^(Next|Now say it yourself)/ }).click();
  }

  await page.getByRole("textbox", { name: "Your explanation" }).fill("Buyers can switch to another product.");
  await page.getByRole("button", { name: /Compare with the page/ }).click();
  await page.getByRole("button", { name: /Nailed it/ }).click();

  await expect(page.getByText(/checks right/)).toBeVisible();
  await page.getByRole("link", { name: /Do this with my own notes/ }).click();
  await expect(page).toHaveURL(/\/today/);
});

test("first-run offers the sample when there is no file yet", async ({ page }) => {
  await page.goto("/today");
  await page.getByRole("link", { name: /Try a one-minute sample first/ }).click();
  await expect(page).toHaveURL(/\/try\/?$/);
});
