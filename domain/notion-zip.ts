import { listZip, ZipError, type ZipEntry } from "./zip-read";

/**
 * Turns an exported workspace zip (Notion "Markdown & CSV", Obsidian vaults) into one Markdown document,
 * one heading per page, so the existing notes importer, topic finder and question engine need no special case.
 */

const MAX_FILES = 60;
const MAX_TOTAL_BYTES = 1_800_000;
const MAX_NESTED_ZIP_BYTES = 40 * 1024 * 1024;
const NOTE_FILE = /\.(md|markdown|txt)$/i;

/** "Cell Membrane 0123…(32 hex).md" → "Cell Membrane". */
export function pageTitleFromPath(path: string) {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.(md|markdown|txt)$/i, "").replace(/\s+[0-9a-f]{32}$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled";
}

function stripFrontMatter(text: string) {
  return text.replace(/^﻿/, "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

/** Notion writes a page's properties ("Created: …", "Tags: …") and child-page links above or instead of text. */
function realText(body: string) {
  const lines = body.split(/\r?\n/);
  let seenTitle = false;
  const kept: string[] = [];
  let header = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s/.test(trimmed)) { seenTitle = true; continue; }
    if (header && seenTitle && !trimmed) { header = false; }
    if (header && /^[A-Za-z][A-Za-z ]{1,28}:\s*\S/.test(trimmed) && trimmed.length < 120) continue;
    if (!trimmed || /^[-*•]?\s*\[[^\]]*\]\([^)]*\)\s*$/.test(trimmed)) continue;
    header = false;
    kept.push(trimmed);
  }
  return kept.join(" ").replace(/\s+/g, " ").trim();
}

function ignored(path: string) {
  return /(^|\/)(__MACOSX|\.[^/]+)(\/|$)/.test(path) || /(^|\/)\._/.test(path);
}

async function collect(entries: ZipEntry[], depth: number, out: Array<{ path: string; text: string }>, budget: { bytes: number }) {
  for (const entry of entries) {
    if (out.length >= MAX_FILES || budget.bytes <= 0) return;
    if (ignored(entry.path)) continue;
    if (/\.zip$/i.test(entry.path) && depth < 2) {
      // Large Notion exports arrive as a zip of zips.
      if (entry.size > MAX_NESTED_ZIP_BYTES) continue;
      try { await collect(listZip(await entry.read(MAX_NESTED_ZIP_BYTES)), depth + 1, out, budget); } catch { /* A damaged part is skipped. */ }
      continue;
    }
    if (!NOTE_FILE.test(entry.path)) continue;
    const raw = new TextDecoder("utf-8").decode(await entry.read());
    budget.bytes -= raw.length;
    out.push({ path: entry.path, text: raw });
  }
}

export type NotesFromZip = { markdown: string; pages: number; skipped: number };

export async function notesFromZip(data: ArrayBuffer | Uint8Array): Promise<NotesFromZip> {
  const found: Array<{ path: string; text: string }> = [];
  await collect(listZip(data), 0, found, { bytes: MAX_TOTAL_BYTES });
  found.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

  const parts: string[] = [];
  let skipped = 0;
  for (const file of found) {
    const body = stripFrontMatter(file.text).trim();
    // A page with no real text (a title and a list of links) is not a topic.
    if (realText(body).length < 60) { skipped += 1; continue; }
    const title = pageTitleFromPath(file.path);
    parts.push(/^\s{0,3}#{1,6}\s/.test(body) ? body : `# ${title}\n\n${body}`);
  }
  if (!parts.length) throw new ZipError("No pages with text were found. In Notion choose Export, then Markdown & CSV, and try again.");
  return { markdown: parts.join("\n\n"), pages: parts.length, skipped };
}
