import { expect, test, type Page } from "@playwright/test";
import { startBuiltPlan, sectionsNav, closeToToday, startFromFile } from "./helpers";

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

async function expectNoOverlap(page: Page, first: string, second: string) {
  const firstBox = await page.locator(first).boundingBox();
  const secondBox = await page.locator(second).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (!firstBox || !secondBox) return;
  const overlaps = firstBox.x < secondBox.x + secondBox.width
    && firstBox.x + firstBox.width > secondBox.x
    && firstBox.y < secondBox.y + secondBox.height
    && firstBox.y + firstBox.height > secondBox.y;
  expect(overlaps, `${first} overlaps ${second}`).toBe(false);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

/** Answers every quick check (a wrong gap word, or option 1), then explains and rates itself. */
async function playQuickRun(page: Page, explanation: string, grade: string) {
  for (let guard = 0; guard < 6; guard += 1) {
    // The previous card animates out first: wait for something that can actually be used.
    await expect(page.locator('#run-explain, input[id^="run-gap"]:not([disabled]), [role="group"][aria-label="Choose one"] button:not([disabled])').first()).toBeVisible();
    if (await page.locator("#run-explain").count()) break;
    const gap = page.locator(`input[id^="run-gap"]:not([disabled])`);
    if (await gap.count()) {
      await gap.fill("zzz");
      await page.getByRole("button", { name: "Check", exact: true }).click();
    } else {
      await page.getByRole("group", { name: "Choose one" }).getByRole("button").first().click();
    }
    await page.getByRole("button", { name: /^(Next|Now say it yourself)/ }).click();
  }
  await page.locator("#run-explain").fill(explanation);
  await page.getByRole("button", { name: /Compare with the page/ }).click();
  await page.getByRole("button", { name: new RegExp(grade) }).click();
}

test("the start screen is one clear screen on phone, tablet and desktop", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
    // One job: no stepper, no exam form, no topic checklist.
    await expect(page.locator(".studio-onboarding-steps")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Continue to exam details|Read my PDF/ })).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    const box = await page.locator(".setup-first-upload").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(viewport.height);
    await expectNoHorizontalOverflow(page);
  }
});

test("a PDF opens its first question by itself, and is still there after a refresh", async ({ page }) => {
  await startFromFile(page, { name: "cell-biology-lecture.pdf", mimeType: "application/pdf", buffer: biologyPdf() });
  await page.reload();
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
  await expect(page.getByText(/Cell Membranes/).first()).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
  await closeToToday(page);
  await expect(page.getByText("Cell Membranes").first()).toBeVisible();
});

test("homepage points into the real revision flow without a duplicate sample", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".booklet-board")).toHaveCount(0);
  await page.locator('[data-hero="marked-script"]').getByRole("link", { name: "Set up" }).click();
  await expect(page.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
});

test("Add source opens the file picker and reads the chosen PDF", async ({ page }) => {
  await page.goto("/today?sample=1");
  const workspace = page.locator(".kelus-space.is-studio");
  await expect(workspace).toBeVisible();
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add source" }).click();
  await (await fileChooser).setFiles({
    name: "cell-biology-lecture.pdf",
    mimeType: "application/pdf",
    buffer: biologyPdf(),
  });
  // The sample is never mixed with your own file: it offers to start your own course with it.
  await page.getByRole("dialog", { name: "Start your own course?" }).getByRole("button", { name: "Start my own course" }).click();
  // Your file starts your own course: Kelus shows what it built, and one tap opens the first question.
  await startBuiltPlan(page);
  await expect(page).toHaveURL(/\/session/, { timeout: 30_000 });
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
});

test("course workspace fills the viewport without a blank footer band", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/today?sample=1");
  const workspace = page.locator(".kelus-space.is-studio");
  await expect(workspace).toBeVisible();
  expect(await workspace.evaluate((element) => element.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(899);
  // Where the course stands, as a path: topics started and the days still ahead.
  const pulse = page.getByRole("group", { name: "Your path through the course" });
  await expect(pulse).toContainText(/of \d+ topics started/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("workspace sidebar can be hidden and a source can be removed from it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/today?sample=1");
  await expect(page.getByRole("complementary", { name: "Course workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Hide workspace sidebar" }).click();
  await expect(page.getByRole("complementary", { name: "Course workspace" })).toHaveCount(0);
  await expect(page.locator(".kelus-space.is-studio.is-rail-hidden")).toBeVisible();
  await page.getByRole("button", { name: "Show workspace sidebar" }).click();
  await expect(page.getByRole("complementary", { name: "Course workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Built-in Microeconomics example" }).click();
  await expect(page.getByRole("group", { name: "Confirm remove Built-in Microeconomics example" })).toContainText("linked topic");
  await page.getByRole("group", { name: "Confirm remove Built-in Microeconomics example" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Remove Built-in Microeconomics example" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
  await expect(page.locator(".material-row")).toHaveCount(0);
});

test("sample course without an original PDF gives the route room and makes upload the first material action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/today?sample=1");
  // Today is one column: the next topic. The notes live in Materials.
  await expect(page.locator(".core-workspace-grid.is-today-single")).toBeVisible();
  await expect(page.locator(".core-source-reader")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add your course PDF" })).toBeVisible();
  await page.screenshot({ path: "/tmp/kelus-sample-route-without-pdf.png", fullPage: true });
  await sectionsNav(page).getByRole("button", { name: "Materials" }).click();
  await expect(page.locator(".material-binder-stack.is-source-first")).toBeVisible();
  await expect(page.locator(".material-row strong").getByText("Built-in Microeconomics example")).toBeVisible();
  await expect(page.getByText("Built-in example · no original PDF")).toBeVisible();
  await expect(page.locator('.material-row a[href="https://kelus.me/route"]')).toHaveCount(0);
  await expect(page.locator(".material-add-page[open] input[type='file']")).toBeVisible();
  expect(await page.locator(".material-add-page").evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(360);
  await page.screenshot({ path: "/tmp/kelus-upload-first-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".material-add-page[open] input[type='file']")).toBeVisible();
  await sectionsNav(page).getByRole("button", { name: "Study plan" }).click();
  await page.locator('button[data-action="start-topic"]').click();
  await expect(page.locator("main.study-shell.is-source-missing")).toBeVisible();
  await expect(page.locator(".session-workspace-source")).toHaveCount(0);
  await expect(page.locator(".study-question")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a real PDF becomes a first question, then Today, topics and a full session", async ({ page }) => {
  await page.goto("/today");
  await page.screenshot({ path: "/tmp/kelus-pdf-first-desktop.png", fullPage: true });
  await startFromFile(page, { name: "cell-biology-lecture.pdf", mimeType: "application/pdf", buffer: biologyPdf() });
  await closeToToday(page);
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("region", { name: "Revision workbench" })).toBeVisible();
  await expect(sectionsNav(page).getByRole("button", { name: "Study plan", exact: true })).toBeVisible();
  await expect(page.locator("#today-title")).toBeVisible();
  // The PDF itself opens in Materials, page by page; Today stays one column.
  await expect(page.locator(".core-source-reader")).toHaveCount(0);
  await sectionsNav(page).getByRole("button", { name: "Materials", exact: true }).click();
  await expect(page.locator(".core-source-reader canvas")).toBeVisible();
  await page.screenshot({ path: "/tmp/kelus-core-source-desktop.png", fullPage: true });
  await sectionsNav(page).getByRole("button", { name: "Study plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toHaveCount(0);
  // The course is named after the file until the learner renames it (no form asks for a name any more).
  await expect(page.getByText(/cell biology lecture/i).first()).toBeVisible();
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await sectionsNav(page).getByRole("button", { name: "Topics", exact: true }).click();
  await expect(page).toHaveURL(/\/today\/?\?section=map/);
  await expect(page.getByRole("list", { name: "Topics, next topic first" })).toBeVisible();
  await expect(page.locator(".index-toc > li").first()).toBeVisible();
  await expect(page.getByLabel("Find a topic")).toHaveCount(0);
  await expect(page.locator(".topic-map-graph")).toHaveCount(0);
  const topic = page.locator(".index-toc-row").filter({ hasText: "Osmosis" }).first();
  await expect(topic).toBeVisible();
  await topic.click();
  await expect(page).toHaveURL(/\/concept\/?\?id=c-source-/);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/section=map/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/kelus-map-mobile.png", fullPage: true });
  await sectionsNav(page).getByRole("button", { name: "Study plan", exact: true }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(page).not.toHaveURL(/section=/);
  await expect(page.locator(".today-evidence-disclosure")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/kelus-today-mobile.png", fullPage: true });
  const start = page.locator('button[data-action="start-topic"]');
  await expect(start).toBeVisible();
  await start.click();

  await expect(page).toHaveURL(/\/session/);
  await expect(page.locator(".study-topic-kicker")).toContainText(/topic 1 of \d+/i);
  // One topic is a short run: instant checks, then one explanation in your own words.
  await expect(page.getByRole("list", { name: /^Step 1 of \d$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Revision pages" })).toHaveCount(0);
  await expect(page.locator(".study-progress")).toHaveCount(0);
  await expect(page.locator("header.site-header.is-session")).toHaveCount(1);
  await expect(page.locator("header.site-header.is-session")).toBeHidden();
  // One quiet header: peeking and removing live behind "More", not in a line above the question.
  await expect(page.getByRole("button", { name: "Peek at the notes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "More session options" })).toBeVisible();
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/kelus-session-mobile.png", fullPage: true });
  await playQuickRun(page, "I cannot yet explain the mechanism from memory.", "Missed it");
  await expect(page.getByRole("heading", { name: /^(Needs another attempt|Partly there)\.$/ })).toBeVisible();
  await expect(page.getByText(/first (?:check|try)/)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /(Next: |last topic for now)/ })).toBeVisible();
  for (const width of [320, 375, 414]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: "/tmp/kelus-result-mobile.png", fullPage: true });
  await page.getByRole("button", { name: /Try again/ }).click();
  await expect(page.getByLabel(/^Check 1 of \d$/)).toBeVisible();
  await playQuickRun(page, "I still cannot explain it.", "Missed it");
  await expect(page.getByText(/try 2/)).toBeVisible();
  await page.getByRole("button", { name: /Continue to/ }).click();
  await expect(page.locator(".reroute-view h1, section[aria-label^=\"Check 1 of\"], .session-learn h1").first()).toBeVisible();
  await expect(page.locator(".reroute-lines")).toHaveCount(0);
  await expect(page.locator(".reroute-cause")).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText(/Last answer:/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/session/);
  await expect(page.locator(".study-topic-kicker")).toContainText("2 of 3");
  await page.goto("/today?section=materials");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  const confirmation = page.getByRole("group", { name: /Confirm remove cell biology lecture/ });
  await expect(confirmation).toContainText("linked topics from your route");
  await confirmation.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Start with your notes." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start today’s route" })).toHaveCount(0);
});
