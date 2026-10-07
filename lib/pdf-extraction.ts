import type { ExtractedMaterialPage, ExtractedTextBlock } from "../domain/types";

type PdfTextItem = { str?: string; hasEOL?: boolean; transform?: number[]; width?: number; height?: number };
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

type OcrLine = { text: string; confidence: number };
type OcrData = { text: string; confidence?: number; blocks?: Array<{ paragraphs: Array<{ lines: OcrLine[] }> }> | null };

/** Below this, a recognised line is more likely a misreading ("Alrerat all acation") than what the page says. */
export const MIN_OCR_LINE_CONFIDENCE = 70;

/**
 * Keeps only the lines the text recogniser is reasonably sure of, paragraphs kept apart. A diagram or a blurry scan
 * yields mostly unsure lines; questions built from them would quote noise as if it were the student's notes.
 */
export function confidentOcrText(data: OcrData) {
  const paragraphs = (data.blocks ?? []).flatMap((block) => block.paragraphs);
  if (!paragraphs.length) return (data.confidence ?? 0) >= MIN_OCR_LINE_CONFIDENCE ? data.text : "";
  return paragraphs
    .map((paragraph) => paragraph.lines.filter((line) => line.confidence >= MIN_OCR_LINE_CONFIDENCE).map((line) => line.text.trim()).filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
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

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return 12;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildLayoutPage(pageNumber: number, rawItems: PdfTextItem[]): ExtractedMaterialPage {
  const items = rawItems.flatMap((item) => {
    const text = item.str?.replace(/\s+/g, " ").trim();
    if (!text) return [];
    const transform = item.transform ?? [];
    const measuredSize = item.height ?? Math.hypot(transform[0] ?? 0, transform[1] ?? 0);
    const fontSize = Math.max(1, measuredSize || 12);
    return [{ text, x: transform[4] ?? 0, y: transform[5] ?? 0, width: item.width ?? 0, height: item.height ?? fontSize, fontSize, hasEOL: Boolean(item.hasEOL) }];
  });
  const lines: Array<ExtractedTextBlock & { hasEOL: boolean }> = [];
  for (const item of items) {
    const previous = lines.at(-1);
    const sameLine = previous && Math.abs(previous.y - item.y) <= Math.max(2, Math.min(previous.fontSize, item.fontSize) * 0.28);
    if (sameLine && !previous.hasEOL) {
      // Fragments that touch (ligatures like "fi", styled runs) belong to one word; only a real gap is a space.
      const gap = item.x - (previous.x + previous.width);
      const glue = previous.width > 0 && gap < Math.min(previous.fontSize, item.fontSize) * 0.1 ? "" : " ";
      previous.text = `${previous.text}${glue}${item.text}`.replace(/\s+/g, " ");
      previous.width = Math.max(previous.width, item.x + item.width - previous.x);
      previous.height = Math.max(previous.height, item.height);
      previous.fontSize = Math.max(previous.fontSize, item.fontSize);
      previous.hasEOL = item.hasEOL;
    } else {
      lines.push({ ...item });
    }
  }
  const bodySize = median(lines.map((line) => line.fontSize));
  let text = "";
  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    if (previous) {
      const gap = Math.abs(previous.y - line.y);
      const paragraphBreak = gap > bodySize * 1.65 || line.fontSize >= bodySize * 1.18 || previous.fontSize >= bodySize * 1.18;
      text += paragraphBreak ? "\n\n" : "\n";
    }
    text += line.text;
  });
  return { pageNumber, text: text.trim(), blocks: lines.map(({ hasEOL: _hasEOL, ...line }) => line) };
}

/** Most pages read from one PDF. Extracting text is fast (31 pages take well under a second); this only guards memory. */
export const MAX_READ_PAGES = 150;

export async function extractPdfPages(file: File, options?: { maxContentPages?: number; onInfo?: (info: { totalPages: number }) => void }): Promise<ExtractedMaterialPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: ExtractedMaterialPage[] = [];
  const maxContentPages = options?.maxContentPages ?? MAX_READ_PAGES;
  options?.onInfo?.({ totalPages: document.numPages });
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

    const lastPage = Math.min(document.numPages, maxContentPages);
    for (let pageNumber = 1; pageNumber <= lastPage; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(buildLayoutPage(pageNumber, content.items as PdfTextItem[]));
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  return pages;
}

export type OcrProgress = {
  phase: "rendering" | "recognizing" | "done";
  pageNumber: number;
  totalPages: number;
  message: string;
};

const OCR_MIN_PAGE_CHARS = 40;

export function pageNeedsOcr(page: ExtractedMaterialPage) {
  if (page.pageNumber <= 0) return false;
  const text = page.text.trim();
  if (text.length < OCR_MIN_PAGE_CHARS) return true;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  // Selectable junk / OCR leftovers: enough length but almost no letters.
  return text.length >= OCR_MIN_PAGE_CHARS && letters / text.length < 0.35;
}

function synthesizeBlocksFromText(text: string): ExtractedTextBlock[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80)
    .map((line, index) => ({
      text: line,
      x: 0,
      y: -index * 16,
      width: Math.max(24, line.length * 7),
      height: 14,
      fontSize: line.length <= 48 ? 16 : 13,
    }));
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error("OCR cancelled.");
    error.name = "AbortError";
    throw error;
  }
}

export async function ocrPdfPages(
  file: File,
  pages: ExtractedMaterialPage[],
  options?: {
    maxPages?: number;
    timeBudgetMs?: number;
    scale?: number;
    stopAfterRecoveredPages?: number;
    signal?: AbortSignal;
    onProgress?: (progress: OcrProgress) => void;
  },
): Promise<{ pages: ExtractedMaterialPage[]; ocrPages: number; timedOut: boolean }> {
  throwIfAborted(options?.signal);

  if (typeof document === "undefined") {
    return { pages, ocrPages: 0, timedOut: false };
  }

  const maxPages = options?.maxPages ?? 8;
  const timeBudgetMs = options?.timeBudgetMs ?? 60_000;
  const scale = options?.scale ?? 1.5;
  const stopAfter = options?.stopAfterRecoveredPages ?? maxPages;
  const startedAt = Date.now();
  const targets = pages
    .filter((page) => pageNeedsOcr(page))
    .slice(0, maxPages);

  if (!targets.length) {
    return { pages, ocrPages: 0, timedOut: false };
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  throwIfAborted(options?.signal);
  const documentProxy = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  throwIfAborted(options?.signal);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  const byNumber = new Map(pages.map((page) => [page.pageNumber, page]));
  let ocrPages = 0;
  let timedOut = false;

  try {
    for (let index = 0; index < targets.length; index += 1) {
      throwIfAborted(options?.signal);
      if (Date.now() - startedAt >= timeBudgetMs) {
        timedOut = true;
        break;
      }
      if (ocrPages >= stopAfter) break;
      const target = targets[index];
      options?.onProgress?.({
        phase: "rendering",
        pageNumber: target.pageNumber,
        totalPages: targets.length,
        message: `Preparing scanned page ${index + 1} of ${targets.length}…`,
      });

      const page = await documentProxy.getPage(target.pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        page.cleanup();
        continue;
      }

      await page.render({ canvasContext: context, canvas, viewport }).promise;
      page.cleanup();
      throwIfAborted(options?.signal);

      options?.onProgress?.({
        phase: "recognizing",
        pageNumber: target.pageNumber,
        totalPages: targets.length,
        message: `Reading scanned page ${index + 1} of ${targets.length}…`,
      });

      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      throwIfAborted(options?.signal);
      const text = confidentOcrText(result.data as OcrData).replace(/[ \t]+\n/g, "\n").trim();
      if (text.length > target.text.trim().length) {
        byNumber.set(target.pageNumber, {
          pageNumber: target.pageNumber,
          text,
          blocks: synthesizeBlocksFromText(text),
        });
        ocrPages += 1;
      }
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
    await documentProxy.destroy();
  }

  options?.onProgress?.({
    phase: "done",
    pageNumber: targets.at(-1)?.pageNumber ?? 0,
    totalPages: targets.length,
    message: ocrPages
      ? `Recovered text from ${ocrPages} scanned page${ocrPages === 1 ? "" : "s"}.`
      : timedOut
        ? "Scan reading stopped after the time limit without usable text."
        : "Scan reading finished without usable text.",
  });

  return {
    pages: pages.map((page) => byNumber.get(page.pageNumber) ?? page),
    ocrPages,
    timedOut,
  };
}
