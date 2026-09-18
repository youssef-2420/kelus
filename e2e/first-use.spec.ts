import { expect, test } from "@playwright/test";

function biologyPdf() {
  const text = [
    "BT /F1 20 Tf 72 720 Td (Cell Membranes) Tj ET",
    "BT /F1 11 Tf 72 690 Td (Cell membranes regulate transport between the cell and its environment.) Tj ET",
    "BT /F1 20 Tf 72 640 Td (Osmosis) Tj ET",
    "BT /F1 11 Tf 72 610 Td (Osmosis depends on cell membranes and moves water across a selectively permeable membrane.) Tj ET",
    "BT /F1 20 Tf 72 560 Td (Diffusion) Tj ET",
    "BT /F1 11 Tf 72 530 Td (Diffusion moves particles down a concentration gradient.) Tj ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("real PDF becomes concepts, diagnosis evidence, and today's route", async ({ page }) => {
  await page.goto("/today");
  await page.getByLabel("Course").fill("Molecular Biology");
  await page.getByLabel("Exam").fill("Cell Biology Final");
  const examDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("When is it?").fill(examDate);
  await page.getByLabel(/45/).check();
  await page.getByRole("button", { name: /Continue with my course/ }).click();

  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { name: "Bring in one real source." })).toBeVisible();
  await page.locator('.material-drop input[type="file"]').setInputFiles({
    name: "cell-biology-lecture.pdf",
    mimeType: "application/pdf",
    buffer: biologyPdf(),
  });
  await expect(page.getByRole("heading", { name: /Kelus found/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Kelus found/ })).toBeFocused();
  await expect(page.locator(".material-ingest")).toBeHidden();
  await page.getByRole("button", { name: /Confirm topics/ }).click();

  await expect(page).toHaveURL(/\/today/);
  const groups = page.getByRole("group", { name: /Familiarity with/ });
  await expect(groups).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await groups.nth(index).getByRole("button", { name: "Weak" }).click();
  }
  await page.getByRole("button", { name: /Continue to recall check/ }).click();
  await page.getByLabel("Try without notes.").fill("Cell membranes regulate transport and selectively control what moves between a cell and its environment.");
  await page.getByRole("button", { name: "Compare answer" }).click();
  await expect(page.getByText("Kelus evidence check")).toBeVisible();
  await page.getByRole("button", { name: "Use this result" }).click();

  await expect(page.getByRole("region", { name: "Revision workbench" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Revision sections" }).getByRole("button", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByText(/Molecular Biology/).first()).toBeVisible();
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("navigation", { name: "Revision sections" }).getByRole("button", { name: "Index", exact: true }).click();
  await expect(page).toHaveURL(/\/today\/?\?section=map/);
  await expect(page.getByRole("list", { name: "Topics by exam weight" })).toBeVisible();
  await expect(page.locator(".index-toc > li").first()).toBeVisible();
  await expect(page.getByLabel("Find a topic")).toHaveCount(0);
  await expect(page.locator(".topic-map-graph")).toHaveCount(0);
  const topic = page.locator(".index-toc-row").filter({ hasText: "Osmosis" }).first();
  await expect(topic).toBeVisible();
  await topic.click();
  await expect(page).toHaveURL(/\/concepts\//);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/section=map/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/kelus-map-mobile.png", fullPage: true });
  await page.getByRole("navigation", { name: "Revision sections" }).getByRole("button", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(page).not.toHaveURL(/section=/);
  await page.locator(".today-evidence-disclosure > summary").click();
  await expect(page.getByText("From your course", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/kelus-today-mobile.png", fullPage: true });
  const start = page.locator("button.today-start");
  await expect(start).toBeVisible();
  await start.click();

  await expect(page).toHaveURL(/\/session/);
  await expect(page.getByRole("list", { name: "Revision pages" })).toBeVisible();
  await page.locator(".session-sources button").first().click();
  await expect(page.getByRole("button", { name: "Close course source" })).toBeFocused();
  await expect(page.locator(".session-source-panel iframe")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Retrieve it/ }).click();
  await page.getByLabel(/Write from memory/).fill("I cannot yet explain the mechanism from memory.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Edit recall answer" }).click();
  await expect(page.getByLabel(/Write from memory/)).toHaveValue("I cannot yet explain the mechanism from memory.");
  await page.getByRole("button", { name: "Back to explanation" }).click();
  await page.getByRole("button", { name: /Retrieve it/ }).click();
  await expect(page.getByLabel(/Write from memory/)).toHaveValue("I cannot yet explain the mechanism from memory.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel(/Use the idea in a different situation/).fill("I cannot apply this relationship to the new situation yet.");
  await expect(page.locator(".study-question")).toHaveCSS("opacity", "1");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/kelus-session-mobile.png", fullPage: true });
  await page.getByRole("button", { name: /Check my thinking/ }).click();
  await page.getByRole("button", { name: "Use this result" }).click();
  await expect(page.getByText("Estimate updated")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: /Route (updated|checked)/ })).toBeVisible();
});
