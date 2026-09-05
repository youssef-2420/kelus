import type { DemoState } from "./demo-store";
import { getSupabaseBrowserClient } from "./supabase-client";

type StoredLearnerState = { state: DemoState; updated_at: string };

export async function readLearnerState(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("learner_states")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle<StoredLearnerState>();
  if (error) throw error;
  return data?.state ?? null;
}

export async function writeLearnerState(userId: string, state: DemoState) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { error } = await client.from("learner_states").upsert({
    user_id: userId,
    state,
    schema_version: 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}
