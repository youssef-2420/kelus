import { isNotesFile } from "@/domain/materials";
import { looksLikeMarkdownHeadings, markdownToPages } from "@/domain/markdown-pages";
import type { ExtractedMaterialPage } from "@/domain/types";
import { extractPdfPages, MAX_READ_PAGES } from "@/lib/pdf-extraction";

export type SourceExtraction = { pages: ExtractedMaterialPage[]; isNotes: boolean; locatorLabel: "Page" | "Section"; totalPages: number; pagesRead: number };

/** One entry point for turning a saved source into pages: a PDF is read page by page, notes by section. */
export async function extractSourcePages(file: File, options?: { maxContentPages?: number }): Promise<SourceExtraction> {
  if (isNotesFile(file)) {
    const text = await file.text();
    if (!looksLikeMarkdownHeadings(text)) {
      throw new NotesWithoutHeadingsError();
    }
    const pages = markdownToPages(text);
    return { pages, isNotes: true, locatorLabel: "Section", totalPages: pages.length, pagesRead: pages.length };
  }
  let totalPages = 0;
  const pages = await extractPdfPages(file, { maxContentPages: options?.maxContentPages ?? MAX_READ_PAGES, onInfo: (info) => { totalPages = info.totalPages; } });
  const pagesRead = pages.filter((page) => page.pageNumber > 0).length;
  return { pages, isNotes: false, locatorLabel: "Page", totalPages: totalPages || pagesRead, pagesRead };
}

export class NotesWithoutHeadingsError extends Error {
  constructor() {
    super("Kelus finds topics from headings. Add a heading above each topic (for example “# Osmosis” or “## Cell membrane”), then add the notes again.");
    this.name = "NotesWithoutHeadingsError";
  }
}
