import { expect, test } from "@playwright/test";

test("the built-in sample shows only in the session that opened it; a later visit starts with your own notes", async ({ context }) => {
  const first = await context.newPage();
  await first.goto("/today?sample=1");
  await expect(first.locator("#today-title")).toBeVisible();
  await expect(first.locator(".studio-topbar-course")).toHaveText("Microeconomics");
  await first.close();

  // A new tab is a new session: the sample saved on this device is not your course.
  const later = await context.newPage();
  await later.goto("/today", { waitUntil: "networkidle" });
  await expect(later.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
  await expect(later.getByText("Microeconomics")).toHaveCount(0);
});
