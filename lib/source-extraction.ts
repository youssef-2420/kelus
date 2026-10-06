import { isNotesFile } from "@/domain/materials";
import { looksLikeMarkdownHeadings, markdownToPages } from "@/domain/markdown-pages";
import type { ExtractedMaterialPage } from "@/domain/types";
import { extractPdfPages } from "@/lib/pdf-extraction";

export type SourceExtraction = { pages: ExtractedMaterialPage[]; isNotes: boolean; locatorLabel: "Page" | "Section" };

/** One entry point for turning a saved source into pages: a PDF is read page by page, notes by section. */
export async function extractSourcePages(file: File, options?: { maxContentPages?: number }): Promise<SourceExtraction> {
  if (isNotesFile(file)) {
    const text = await file.text();
    if (!looksLikeMarkdownHeadings(text)) {
      throw new NotesWithoutHeadingsError();
    }
    return { pages: markdownToPages(text), isNotes: true, locatorLabel: "Section" };
  }
  return { pages: await extractPdfPages(file, options), isNotes: false, locatorLabel: "Page" };
}

export class NotesWithoutHeadingsError extends Error {
  constructor() {
    super("Kelus finds topics from headings. Add a heading above each topic (for example “# Osmosis” or “## Cell membrane”), then add the notes again.");
    this.name = "NotesWithoutHeadingsError";
  }
}
