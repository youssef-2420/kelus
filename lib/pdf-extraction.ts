import type { ExtractedMaterialPage } from "../domain/types";

type PdfTextItem = { str?: string; hasEOL?: boolean };

export async function extractPdfPages(file: File): Promise<ExtractedMaterialPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: ExtractedMaterialPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const raw of content.items) {
        const item = raw as PdfTextItem;
        if (!item.str) continue;
        text += `${item.str}${item.hasEOL ? "\n" : " "}`;
      }
      pages.push({ pageNumber, text: text.replace(/[ \t]+\n/g, "\n").trim() });
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  return pages;
}
