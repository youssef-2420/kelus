import type { ExtractedMaterialPage } from "./types";

/**
 * Turns Markdown (or plain text with # headings) into the same "pages" a PDF produces, so the topic finder,
 * content engine and source viewer need no special case. A section is one page; headings keep a larger size
 * so they are recognised as headings; lists, steps, tables and links are flattened to plain lines.
 */

export const MAX_NOTES_BYTES = 2_000_000;
const MAX_SECTIONS = 40;
const MAX_CHARS = 200_000;
const BODY_SIZE = 12;
const HEADING_SIZE: Record<number, number> = { 1: 22, 2: 20, 3: 17, 4: 15, 5: 14, 6: 14 };

type Line = { kind: "heading"; level: number; text: string } | { kind: "body"; text: string };

/** Removes Markdown markup but keeps the words. */
export function plainInline(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, label?: string) => label ?? target)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>\n]+>/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1")
    .replace(/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const SEPARATOR_ROW = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function tableCells(line: string) {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => plainInline(cell)).filter(Boolean);
}

export function parseMarkdownLines(markdown: string): Line[] {
  const source = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/^﻿/, "")
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .slice(0, MAX_CHARS);
  const raw = source.split("\n");
  const out: Line[] = [];
  let paragraph: string[] = [];
  let inFence = false;

  const flush = () => {
    const text = plainInline(paragraph.join(" "));
    if (text) out.push({ kind: "body", text });
    paragraph = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const line = raw[index];
    if (/^\s*(```|~~~)/.test(line)) { flush(); inFence = !inFence; continue; }
    if (inFence) {
      const code = line.trim();
      if (code) out.push({ kind: "body", text: code });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); continue; }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flush();
      const text = plainInline(heading[2]);
      if (text) out.push({ kind: "heading", level: heading[1].length, text });
      continue;
    }

    // A table: skip the header row (it is followed by a separator) and flatten the rest to "A: B".
    if (line.includes("|") && raw[index + 1] && SEPARATOR_ROW.test(raw[index + 1]) && !SEPARATOR_ROW.test(line)) { flush(); continue; }
    if (SEPARATOR_ROW.test(line) && line.includes("-") && line.includes("|")) { flush(); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      const cells = tableCells(line);
      if (cells.length === 2) out.push({ kind: "body", text: `${cells[0]}: ${cells[1]}` });
      else if (cells.length > 2) out.push({ kind: "body", text: `${cells[0]}: ${cells.slice(1).join(" · ")}` });
      continue;
    }

    const quote = line.replace(/^\s{0,3}>\s?/, "");
    const item = quote.match(/^\s*(?:([-*+•])|(\d{1,2})[.)])\s+(?:\[[ xX]\]\s+)?(.+)$/);
    if (item) {
      flush();
      const text = plainInline(item[3]);
      if (text) out.push({ kind: "body", text: item[2] ? `${Number(item[2])}. ${text}` : `• ${text}` });
      continue;
    }
    paragraph.push(quote.trim());
  }
  flush();
  return out;
}

/** The shallowest heading level used at least twice, else the shallowest used at all. */
function splitLevel(lines: Line[]) {
  const counts = new Map<number, number>();
  for (const line of lines) if (line.kind === "heading") counts.set(line.level, (counts.get(line.level) ?? 0) + 1);
  const levels = [...counts.keys()].sort((a, b) => a - b);
  return levels.find((level) => (counts.get(level) ?? 0) >= 2) ?? levels[0] ?? null;
}

export function markdownToPages(markdown: string): ExtractedMaterialPage[] {
  const lines = parseMarkdownLines(markdown);
  const level = splitLevel(lines);
  if (level === null) return [];

  const sections: Line[][] = [];
  let current: Line[] = [];
  for (const line of lines) {
    if (line.kind === "heading" && line.level <= level && current.some((entry) => entry.kind === "body" || entry.kind === "heading")) {
      sections.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) sections.push(current);

  // A title with a properties block ("Created: ...", "Tags: ...") is not a study topic. Drop an opening section
  // that is only a document title above the split level and has little text of its own.
  const first = sections[0];
  if (first && first[0]?.kind === "heading" && first[0].level < level) {
    const body = first.filter((entry) => entry.kind === "body").map((entry) => entry.text).join(" ");
    if (body.length < 300) sections.shift();
  }

  return sections.slice(0, MAX_SECTIONS).map((section, index) => {
    let text = "";
    const blocks: NonNullable<ExtractedMaterialPage["blocks"]> = [];
    section.forEach((line, position) => {
      const size = line.kind === "heading" ? (HEADING_SIZE[line.level] ?? 14) : BODY_SIZE;
      const previous = section[position - 1];
      if (position > 0) text += line.kind === "heading" || previous?.kind === "heading" ? "\n\n" : "\n";
      text += line.text;
      blocks.push({ text: line.text, x: 40, y: 760 - position * 20, width: line.text.length * 6, height: size, fontSize: size });
    });
    return { pageNumber: index + 1, text: text.trim(), blocks };
  });
}

export function looksLikeMarkdownHeadings(markdown: string) {
  return /^\s{0,3}#{1,6}\s+\S/m.test(markdown);
}
