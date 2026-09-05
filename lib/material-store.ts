import { isPdfFile, materialTitle, parseMaterialUrl } from "../domain/materials";
import type { CourseMaterial } from "../domain/types";

const METADATA_KEY = "kelus-course-materials-v1";
const DATABASE_NAME = "kelus-material-files-v1";
const DATABASE_VERSION = 1;
const FILE_STORE = "files";
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const SERVER_SNAPSHOT: CourseMaterial[] = [];

let cache: CourseMaterial[] | null = null;
const listeners = new Set<() => void>();

function isMaterial(value: unknown): value is CourseMaterial {
  const item = value as CourseMaterial;
  return Boolean(
    item?.id
    && item.courseId
    && item.title
    && ["pdf", "video", "link"].includes(item.kind)
    && ["local", "url"].includes(item.storage)
    && item.addedAt
    && (item.storage === "local" || typeof item.sourceUrl === "string"),
  );
}

function readMetadata() {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(METADATA_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter(isMaterial) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(items: CourseMaterial[]) {
  cache = [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  window.localStorage.setItem(METADATA_KEY, JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local file storage is not available in this browser."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FILE_STORE)) request.result.createObjectStore(FILE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("The PDF could not be saved on this device."));
  });
}

function writePdf(id: string, file: File) {
  return openDatabase().then((database) => new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).put(file, id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(new Error("The PDF could not be saved on this device.")); };
  }));
}

function deletePdf(id: string) {
  return openDatabase().then((database) => new Promise<void>((resolve) => {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); resolve(); };
  }));
}

export function subscribeMaterials(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMaterialsSnapshot() {
  return readMetadata();
}

export function getServerMaterialsSnapshot() {
  return SERVER_SNAPSHOT;
}

export function addLinkMaterial(input: { courseId: string; title: string; value: string; nowIso?: string }) {
  const parsed = parseMaterialUrl(input.value);
  const record: CourseMaterial = {
    id: `material-${crypto.randomUUID()}`,
    courseId: input.courseId,
    kind: parsed.kind,
    storage: "url",
    title: materialTitle(input.title, parsed.host),
    sourceUrl: parsed.url,
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    addedAt: input.nowIso ?? new Date().toISOString(),
  };
  persist([...readMetadata(), record]);
  return record;
}

export async function addPdfMaterial(input: { courseId: string; file: File; nowIso?: string }) {
  if (!isPdfFile(input.file)) throw new Error("Choose a PDF file.");
  if (input.file.size > MAX_PDF_BYTES) throw new Error("PDFs must be 20 MB or smaller.");
  const record: CourseMaterial = {
    id: `material-${crypto.randomUUID()}`,
    courseId: input.courseId,
    kind: "pdf",
    storage: "local",
    title: materialTitle("", input.file.name),
    sourceUrl: null,
    fileName: input.file.name,
    mimeType: input.file.type || "application/pdf",
    sizeBytes: input.file.size,
    addedAt: input.nowIso ?? new Date().toISOString(),
  };
  await writePdf(record.id, input.file);
  persist([...readMetadata(), record]);
  return record;
}

export async function removeMaterial(id: string) {
  const item = readMetadata().find((material) => material.id === id);
  if (item?.storage === "local") await deletePdf(id);
  persist(readMetadata().filter((material) => material.id !== id));
}

export function readLocalPdf(id: string) {
  return openDatabase().then((database) => new Promise<Blob | null>((resolve) => {
    const request = database.transaction(FILE_STORE, "readonly").objectStore(FILE_STORE).get(id);
    request.onsuccess = () => { database.close(); resolve(request.result instanceof Blob ? request.result : null); };
    request.onerror = () => { database.close(); resolve(null); };
  }));
}
