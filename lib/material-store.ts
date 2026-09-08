import { isPdfFile, materialTitle, parseMaterialUrl } from "../domain/materials";
import type { CourseMaterial, MaterialRole } from "../domain/types";

const METADATA_KEY = "kelus-course-materials-v1";
const DATABASE_NAME = "kelus-material-files-v1";
const DATABASE_VERSION = 1;
const FILE_STORE = "files";
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const SERVER_SNAPSHOT: CourseMaterial[] = [];
const GUEST_OWNER = "guest";

let cache: CourseMaterial[] | null = null;
let activeOwnerId: string | null = null;
const listeners = new Set<() => void>();

const MATERIAL_ROLES: MaterialRole[] = ["syllabus", "lecture_slides", "notes", "past_exam", "course_outline", "other"];
const PROCESSING_STATUSES: CourseMaterial["processingStatus"][] = ["saved", "processing", "ready", "failed"];

function normalizeMaterial(value: unknown): CourseMaterial | null {
  const item = value as CourseMaterial;
  const valid = Boolean(
    item?.id
    && item.courseId
    && item.title
    && ["pdf", "video", "link"].includes(item.kind)
    && ["local", "url"].includes(item.storage)
    && item.addedAt
    && (item.storage === "local" || typeof item.sourceUrl === "string"),
  );
  if (!valid) return null;
  return {
    ...item,
    role: MATERIAL_ROLES.includes(item.role) ? item.role : "notes",
    processingStatus: PROCESSING_STATUSES.includes(item.processingStatus) ? item.processingStatus : "saved",
    updatedAt: item.updatedAt ?? item.addedAt,
  };
}

export function materialMetadataStorageKey(ownerId: string | null = activeOwnerId) {
  return `${METADATA_KEY}:${ownerId ?? GUEST_OWNER}`;
}

export function materialFileStorageKey(id: string, ownerId: string | null = activeOwnerId) {
  return `${ownerId ?? GUEST_OWNER}:${id}`;
}

function readMetadataFor(ownerId: string | null) {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(materialMetadataStorageKey(ownerId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeMaterial).filter((item): item is CourseMaterial => Boolean(item)) : [];
  } catch {
    return [];
  }
}

function readMetadata() {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (cache) return cache;
  cache = readMetadataFor(activeOwnerId);
  return cache;
}

function persist(items: CourseMaterial[]) {
  cache = [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  window.localStorage.setItem(materialMetadataStorageKey(), JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}

function persistFor(ownerId: string | null, items: CourseMaterial[]) {
  const sorted = [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  if (ownerId === activeOwnerId) cache = sorted;
  window.localStorage.setItem(materialMetadataStorageKey(ownerId), JSON.stringify(sorted));
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

function writePdfForOwner(id: string, file: Blob, ownerId: string | null) {
  return openDatabase().then((database) => new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).put(file, materialFileStorageKey(id, ownerId));
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(new Error("The PDF could not be saved on this device.")); };
  }));
}

function writePdf(id: string, file: Blob) {
  return writePdfForOwner(id, file, activeOwnerId);
}

function deletePdf(id: string) {
  return openDatabase().then((database) => new Promise<void>((resolve) => {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).delete(materialFileStorageKey(id));
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

export function getMaterialOwner() {
  return activeOwnerId;
}

export function setMaterialOwner(userId: string | null) {
  if (activeOwnerId === userId && cache) return;
  activeOwnerId = userId;
  cache = readMetadataFor(userId);
  listeners.forEach((listener) => listener());
}

/** Move only anonymous local materials into the first account that claims them. */
export async function claimGuestMaterials(userId: string) {
  const guestMaterials = readMetadataFor(null);
  if (!guestMaterials.length) {
    setMaterialOwner(userId);
    return;
  }
  const accountMaterials = readMetadataFor(userId);
  activeOwnerId = userId;
  cache = accountMaterials;
  await Promise.all(guestMaterials.filter((item) => item.storage === "local").map(async (item) => {
    const blob = await readPdfForOwner(item.id, null);
    if (blob) await writePdfForOwner(item.id, blob, userId);
  }));
  persistFor(userId, [...accountMaterials, ...guestMaterials]);
  persistFor(null, []);
  cache = readMetadataFor(userId);
  listeners.forEach((listener) => listener());
}

export function mergeMaterialMetadata(remote: CourseMaterial[]) {
  const merged = new Map<string, CourseMaterial | null>();
  for (const item of [...readMetadata(), ...remote]) {
    const normalized = normalizeMaterial(item);
    if (!normalized) continue;
    const existing = merged.get(normalized.id);
    const existingTime = existing ? Date.parse(existing.updatedAt ?? existing.addedAt) : 0;
    const nextTime = Date.parse(normalized.updatedAt ?? normalized.addedAt);
    if (!existing || nextTime >= existingTime) merged.set(normalized.id, normalized);
  }
  const normalized = [...merged.values()].filter((item): item is CourseMaterial => Boolean(item));
  persist(normalized);
  return normalized;
}

export function cacheLocalPdf(id: string, file: Blob) {
  return writePdf(id, file);
}

export function addLinkMaterial(input: { courseId: string; title: string; value: string; role: MaterialRole; nowIso?: string }) {
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
    role: input.role,
    processingStatus: "saved",
    addedAt: input.nowIso ?? new Date().toISOString(),
    updatedAt: input.nowIso ?? new Date().toISOString(),
  };
  persist([...readMetadata(), record]);
  return record;
}

export async function addPdfMaterial(input: { courseId: string; file: File; role: MaterialRole; nowIso?: string }) {
  if (!isPdfFile(input.file)) throw new Error("Choose a PDF file.");
  if (input.file.size > MAX_PDF_BYTES) throw new Error("PDFs must be 20 MB or smaller.");
  const timestamp = input.nowIso ?? new Date().toISOString();
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
    role: input.role,
    processingStatus: "saved",
    addedAt: timestamp,
    updatedAt: timestamp,
  };
  await writePdf(record.id, input.file);
  persist([...readMetadata(), record]);
  return record;
}

export function updateMaterialProcessingStatus(id: string, processingStatus: CourseMaterial["processingStatus"]) {
  const items = readMetadata();
  const item = items.find((material) => material.id === id);
  if (!item) return null;
  const updated = { ...item, processingStatus, updatedAt: new Date().toISOString() };
  persist(items.map((material) => material.id === id ? updated : material));
  return updated;
}

export function clearMaterials() {
  if (typeof window === "undefined") return;
  cache = [];
  try {
    window.localStorage.setItem(materialMetadataStorageKey(), "[]");
  } catch {
    /* Materials clear must never break the page. */
  }
  listeners.forEach((listener) => listener());
}

/** Seeds a visible sample shelf item so demo courses don't look empty. */
export function seedDemoMaterial(courseId: string, nowIso?: string) {
  const timestamp = nowIso ?? new Date().toISOString();
  const items = readMetadata();
  if (items.some((item) => item.courseId === courseId && item.id.startsWith("material-demo-"))) {
    return items;
  }
  const record: CourseMaterial = {
    id: "material-demo-microeconomics",
    courseId,
    kind: "link",
    storage: "url",
    title: "Sample: Microeconomics lecture pack",
    sourceUrl: "https://kelus.me/route",
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    role: "lecture_slides",
    processingStatus: "ready",
    addedAt: timestamp,
    updatedAt: timestamp,
  };
  persist([record, ...items.filter((item) => item.courseId !== courseId)]);
  return readMetadata();
}

export async function removeMaterial(id: string) {
  const item = readMetadata().find((material) => material.id === id);
  if (item?.storage === "local") await deletePdf(id);
  persist(readMetadata().filter((material) => material.id !== id));
}

function readPdfForOwner(id: string, ownerId: string | null) {
  return openDatabase().then((database) => new Promise<Blob | null>((resolve) => {
    const request = database.transaction(FILE_STORE, "readonly").objectStore(FILE_STORE).get(materialFileStorageKey(id, ownerId));
    request.onsuccess = () => { database.close(); resolve(request.result instanceof Blob ? request.result : null); };
    request.onerror = () => { database.close(); resolve(null); };
  }));
}

export function readLocalPdf(id: string) {
  return readPdfForOwner(id, activeOwnerId);
}
