import { notesFromZip } from "@/domain/notion-zip";
import { ZipError } from "@/domain/zip-read";

export const MAX_ZIP_BYTES = 40 * 1024 * 1024;

/** A zip export becomes one Markdown notes file, so everything after this treats it like any other notes. */
export async function zipToNotesFile(file: File): Promise<File> {
  if (file.size > MAX_ZIP_BYTES) throw new ZipError("This zip is over 40 MB. Export fewer pages and try again.");
  const { markdown } = await notesFromZip(await file.arrayBuffer());
  const name = file.name.replace(/\.zip$/i, "").replace(/\s+[0-9a-f]{32}$/i, "").trim() || "notes";
  // RFC 7763's variant parameter keeps where the notes came from, so the library can show Notion's mark beside them.
  return new File([markdown], `${name}.md`, { type: "text/markdown;variant=notion" });
}
