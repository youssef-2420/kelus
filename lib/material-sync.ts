import type { CourseMaterial } from "@/domain/types";
import { cacheLocalPdf, getMaterialsSnapshot, mergeMaterialMetadata } from "./material-store";
import { getSupabaseBrowserClient } from "./supabase-client";

const BUCKET = "kelus-course-materials";
const pathFor = (userId: string, materialId: string) => `${userId}/${materialId}.pdf`;

type MaterialStateRow = { materials: CourseMaterial[]; updated_at: string };

export async function readRemoteMaterialState(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("material_states")
    .select("materials, updated_at")
    .eq("user_id", userId)
    .maybeSingle<MaterialStateRow>();
  if (error) throw error;
  return data?.materials ?? null;
}

export async function writeRemoteMaterialState(userId: string, materials = getMaterialsSnapshot()) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { error } = await client.from("material_states").upsert({
    user_id: userId,
    materials,
    schema_version: 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function initializeMaterialSync(userId: string) {
  const remote = await readRemoteMaterialState(userId);
  if (!remote) {
    await writeRemoteMaterialState(userId);
    return getMaterialsSnapshot();
  }
  const merged = mergeMaterialMetadata(remote);
  await writeRemoteMaterialState(userId, merged);
  return merged;
}

export async function uploadMaterialPdf(userId: string, material: CourseMaterial, file: Blob) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { error } = await client.storage.from(BUCKET).upload(pathFor(userId, material.id), file, {
    contentType: material.mimeType ?? "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  await writeRemoteMaterialState(userId);
}

export async function readMaterialPdf(materialId: string, userId?: string | null) {
  const { readLocalPdf } = await import("./material-store");
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
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { error } = await client.storage.from(BUCKET).remove([pathFor(userId, materialId)]);
  if (error) throw error;
  await writeRemoteMaterialState(userId);
}
