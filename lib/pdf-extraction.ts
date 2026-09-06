import type { ExtractedMaterialPage } from "../domain/types";

type PdfTextItem = { str?: string; hasEOL?: boolean };
type PdfOutlineNode = { title?: string; items?: PdfOutlineNode[] };

export type PdfTextDensity = "empty" | "sparse" | "ok";

export type PdfTextQuality = {
  totalChars: number;
  pagesWithText: number;
  pageCount: number;
  density: PdfTextDensity;
};

export function assessPdfTextQuality(pages: ExtractedMaterialPage[]): PdfTextQuality {
  const pageCount = pages.filter((page) => page.pageNumber > 0).length || pages.length;
  const contentPages = pages.filter((page) => page.pageNumber > 0);
  const target = contentPages.length ? contentPages : pages;
  const pagesWithText = target.filter((page) => page.text.trim().length > 0).length;
  const totalChars = target.reduce((sum, page) => sum + page.text.trim().length, 0);
  let density: PdfTextDensity = "ok";
  if (totalChars < 40) density = "empty";
  else if (totalChars < 400 || (target.length > 0 && pagesWithText / target.length < 0.25)) density = "sparse";
  return { totalChars, pagesWithText, pageCount: pageCount || target.length, density };
}

function flattenOutline(nodes: PdfOutlineNode[] | null | undefined, depth = 0): string[] {
  if (!nodes?.length || depth > 4) return [];
  const titles: string[] = [];
  for (const node of nodes) {
    const title = node.title?.replace(/\s+/g, " ").trim();
    if (title && title.length >= 3 && title.length <= 72) titles.push(title);
    titles.push(...flattenOutline(node.items, depth + 1));
    if (titles.length >= 40) break;
  }
  return titles;
}

export async function extractPdfPages(file: File): Promise<ExtractedMaterialPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: ExtractedMaterialPage[] = [];
  try {
    try {
      const outline = (await document.getOutline()) as PdfOutlineNode[] | null;
      const titles = flattenOutline(outline);
      if (titles.length) {
        pages.push({ pageNumber: 0, text: titles.join("\n") });
      }
    } catch {
      // Outline is optional; text extraction continues.
    }

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
