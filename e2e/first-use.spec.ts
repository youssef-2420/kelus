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

  await expect(page).toHaveURL(/\/materials/);
  await expect(page.getByRole("heading", { name: "Course material" })).toBeVisible();
  await page.locator('.material-drop input[type="file"]').setInputFiles({
    name: "cell-biology-lecture.pdf",
    mimeType: "application/pdf",
    buffer: biologyPdf(),
  });
  await expect(page.getByRole("heading", { name: /Kelus found/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Kelus found/ })).toBeFocused();
  await expect(page.locator(".material-ingest")).toBeHidden();
  await page.getByRole("button", { name: /Build my Knowledge Map/ }).click();
  await expect(page.getByText(/confirmed concept/)).toBeVisible();
  await expect(page.locator("#material-ready-title")).toBeFocused();
  await page.getByRole("button", { name: "Add another source" }).click();
  await expect(page.locator(".material-ingest")).toBeVisible();
  await page.getByRole("button", { name: "Review concepts", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Kelus found/ })).toBeFocused();
  await page.getByRole("button", { name: /Build my Knowledge Map/ }).click();
  await page.getByRole("link", { name: /Continue: short check/ }).click();

  const groups = page.getByRole("group", { name: /Familiarity with/ });
  await expect(groups).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await groups.nth(index).getByRole("button", { name: "Weak" }).click();
  }
  await page.getByRole("button", { name: /Recall check, then today’s route/ }).click();
  await page.getByLabel("Try without notes.").fill("Cell membranes regulate transport and selectively control what moves between a cell and its environment.");
  await page.getByRole("button", { name: "Compare answer" }).click();
  await expect(page.getByText("Kelus evidence check")).toBeVisible();
  await page.getByRole("button", { name: "Use this result" }).click();

  await expect(page.getByRole("heading", { name: "Today’s route" })).toBeVisible();
  await expect(page.getByText(/Molecular Biology/).first()).toBeVisible();
  const start = page.locator("button.today-start");
  await expect(start).toBeVisible();
  await start.click();

  await expect(page).toHaveURL(/\/session/);
  await page.getByRole("button", { name: /Retrieve it/ }).click();
  await page.getByLabel(/Write from memory/).fill("I cannot yet explain the mechanism from memory.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel(/Use the idea in a different situation/).fill("I cannot apply this relationship to the new situation yet.");
  await page.getByRole("button", { name: /Check my thinking/ }).click();
  await page.getByRole("button", { name: "Use this result" }).click();
  await expect(page.getByText("Learner model updated")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: /Route (updated|checked)/ })).toBeVisible();
});
