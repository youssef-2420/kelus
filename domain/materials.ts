import type { MaterialKind, MaterialRole } from "./types";

const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "loom.com"];

export const MATERIAL_ROLES: Array<{ value: MaterialRole; label: string }> = [
  { value: "syllabus", label: "Syllabus" },
  { value: "lecture_slides", label: "Lecture slides" },
  { value: "notes", label: "Notes" },
  { value: "past_exam", label: "Past exam" },
  { value: "course_outline", label: "Course outline" },
  { value: "other", label: "Other source" },
];

export function materialRoleLabel(role: MaterialRole) {
  return MATERIAL_ROLES.find((item) => item.value === role)?.label ?? "Other source";
}

export function parseMaterialUrl(value: string): { url: string; kind: MaterialKind; host: string } {
  const raw = value.trim();
  if (!raw) throw new Error("Paste a PDF, video, or web link.");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Enter a complete link beginning with http:// or https://.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// links are supported.");
  }
  const host = parsed.hostname.replace(/^www\./, "");
  const kind: MaterialKind = VIDEO_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`))
    ? "video"
    : parsed.pathname.toLowerCase().endsWith(".pdf")
      ? "pdf"
      : "link";
  return { url: parsed.toString(), kind, host };
}

export function materialTitle(input: string, fallback: string) {
  const title = input.trim();
  return title || fallback.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
}

export function isPdfFile(file: Pick<File, "name" | "type">) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
