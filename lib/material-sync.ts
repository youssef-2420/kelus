import type { CourseMaterial } from "@/domain/types";
import { cacheLocalPdf, getMaterialsSnapshot, mergeMaterialMetadata, readLocalPdf, removeMaterial } from "./material-store";
import { getSupabaseBrowserClient } from "./supabase-client";

const BUCKET = "kelus-course-materials";
const QUEUE_KEY = "kelus-material-sync-queue-v2";
const pathFor = (userId: string, materialId: string) => `${userId}/${materialId}.pdf`;

type MaterialRow = {
  user_id: string;
  id: string;
  course_id: string;
  kind: CourseMaterial["kind"];
  storage: CourseMaterial["storage"];
  title: string;
  source_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  role: CourseMaterial["role"];
  processing_status: CourseMaterial["processingStatus"];
  added_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SyncOperation = { type: "upsert" | "upload" | "delete"; userId: string; materialId: string; material?: CourseMaterial };

type Reconciliation = {
  materials: CourseMaterial[];
  removeLocalIds: string[];
  pushLocal: CourseMaterial[];
};

function materialTimestamp(material: CourseMaterial) {
  return Date.parse(material.updatedAt ?? material.addedAt);
}

function toRow(userId: string, material: CourseMaterial): MaterialRow {
  return {
    user_id: userId,
    id: material.id,
    course_id: material.courseId,
    kind: material.kind,
    storage: material.storage,
    title: material.title,
    source_url: material.sourceUrl,
    file_name: material.fileName,
    mime_type: material.mimeType,
    size_bytes: material.sizeBytes,
    role: material.role,
    processing_status: material.processingStatus,
    added_at: material.addedAt,
    updated_at: material.updatedAt ?? material.addedAt,
    deleted_at: null,
  };
}

function fromRow(row: MaterialRow): CourseMaterial {
  return {
    id: row.id,
    courseId: row.course_id,
    kind: row.kind,
    storage: row.storage,
    title: row.title,
    sourceUrl: row.source_url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    role: row.role,
    processingStatus: row.processing_status,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

function readQueue(): SyncOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as SyncOperation[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncOperation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
}

function enqueue(operation: SyncOperation) {
  const queue = readQueue().filter((item) => !(item.userId === operation.userId && item.materialId === operation.materialId && item.type === operation.type));
  writeQueue([...queue, operation]);
}

async function upsertMaterial(userId: string, material: CourseMaterial) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { error } = await client.from("course_materials").upsert(toRow(userId, material), { onConflict: "user_id,id" });
  if (error) throw error;
}

async function markDeleted(userId: string, materialId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const now = new Date().toISOString();
  const { error } = await client.from("course_materials").update({ deleted_at: now, updated_at: now }).eq("user_id", userId).eq("id", materialId);
  if (error) throw error;
  const { error: storageError } = await client.storage.from(BUCKET).remove([pathFor(userId, materialId)]);
  if (storageError) throw storageError;
}

async function uploadPdf(userId: string, material: CourseMaterial, file: Blob) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await upsertMaterial(userId, material);
  const { error } = await client.storage.from(BUCKET).upload(pathFor(userId, material.id), file, {
    contentType: material.mimeType ?? "application/pdf",
    upsert: true,
  });
  if (error) throw error;
}

export async function readRemoteMaterialState(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [] as MaterialRow[];
  const { data, error } = await client.from("course_materials").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as MaterialRow[];
}

async function readLegacyMaterialState(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [] as CourseMaterial[];
  const { data, error } = await client.from("material_states").select("materials").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.materials) ? data.materials as CourseMaterial[] : [];
}

export function reconcileMaterialRecords(localMaterials: CourseMaterial[], rows: MaterialRow[]): Reconciliation {
  const local = new Map(localMaterials.map((material) => [material.id, material]));
  const materials: CourseMaterial[] = [];
  const removeLocalIds: string[] = [];
  const pushLocal: CourseMaterial[] = [];

  for (const row of rows) {
    const localMaterial = local.get(row.id);
    if (row.deleted_at && (!localMaterial || Date.parse(row.deleted_at) >= materialTimestamp(localMaterial))) {
      if (localMaterial) removeLocalIds.push(row.id);
      local.delete(row.id);
      continue;
    }
    if (row.deleted_at) continue;
    const remoteMaterial = fromRow(row);
    if (!localMaterial || materialTimestamp(remoteMaterial) > materialTimestamp(localMaterial)) {
      materials.push(remoteMaterial);
    } else if (materialTimestamp(localMaterial) > materialTimestamp(remoteMaterial)) {
      materials.push(localMaterial);
      pushLocal.push(localMaterial);
    } else {
      materials.push(localMaterial);
    }
    local.delete(row.id);
  }

  for (const material of local.values()) {
    materials.push(material);
    pushLocal.push(material);
  }
  return { materials, removeLocalIds, pushLocal };
}

export async function writeRemoteMaterialState(userId: string, materials = getMaterialsSnapshot()) {
  const results = await Promise.allSettled(materials.map((material) => upsertMaterial(userId, material)));
  results.forEach((result, index) => {
    if (result.status === "rejected") enqueue({ type: "upsert", userId, materialId: materials[index].id, material: materials[index] });
  });
  if (results.some((result) => result.status === "rejected")) throw new Error("Some material changes are waiting to sync.");
}

export async function initializeMaterialSync(userId: string) {
  await flushMaterialSyncQueue(userId);
  let rows = await readRemoteMaterialState(userId);
  if (!rows.length) {
    const legacy = await readLegacyMaterialState(userId);
    if (legacy.length) {
      await Promise.all(legacy.map((material) => upsertMaterial(userId, material)));
      rows = await readRemoteMaterialState(userId);
    }
  }
  const reconciliation = reconcileMaterialRecords(getMaterialsSnapshot(), rows);
  await Promise.all(reconciliation.removeLocalIds.map((id) => removeMaterial(id)));
  await Promise.all(reconciliation.pushLocal.map((material) => upsertMaterial(userId, material)));
  return mergeMaterialMetadata(reconciliation.materials);
}

export async function uploadMaterialPdf(userId: string, material: CourseMaterial, file: Blob) {
  try {
    await uploadPdf(userId, material, file);
  } catch (error) {
    enqueue({ type: "upload", userId, materialId: material.id, material });
    throw error;
  }
}

export async function readMaterialPdf(materialId: string, userId?: string | null) {
  const local = await readLocalPdf(materialId);
  if (local || !userId) return local;
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(BUCKET).download(pathFor(userId, materialId));
  if (error || !data) return null;
  await cacheLocalPdf(materialId, data);
  return data;
}

export async function removeRemoteMaterial(userId: string, materialId: string) {
  try {
    await markDeleted(userId, materialId);
  } catch (error) {
    enqueue({ type: "delete", userId, materialId });
    throw error;
  }
}

export async function flushMaterialSyncQueue(userId: string) {
  const pending = readQueue();
  if (!pending.length) return 0;
  const remaining: SyncOperation[] = [];
  let completed = 0;
  for (const operation of pending) {
    if (operation.userId !== userId) {
      remaining.push(operation);
      continue;
    }
    try {
      if (operation.type === "delete") await markDeleted(userId, operation.materialId);
      if (operation.type === "upsert" && operation.material) await upsertMaterial(userId, operation.material);
      if (operation.type === "upload" && operation.material) {
        const file = await readLocalPdf(operation.materialId);
        if (!file) throw new Error("The local PDF is unavailable for retry.");
        await uploadPdf(userId, operation.material, file);
      }
      completed += 1;
    } catch {
      remaining.push(operation);
    }
  }
  writeQueue(remaining);
  return completed;
}
