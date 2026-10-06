/**
 * The on-device model built into recent Chrome (the Prompt API). No key, no server, nothing leaves the device.
 * Everything here is optional: where it is missing the offline questions are used, exactly as before.
 */

type ModelSession = { prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>; destroy(): void };
type ModelApi = {
  availability(options?: object): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(options?: object): Promise<ModelSession>;
};

export type LocalAiState = "unknown" | "unavailable" | "downloadable" | "downloading" | "available";

const EVENT = "kelus-local-ai";
const OPTIONS = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] };
let state: LocalAiState = "unknown";
let progress = 0;
let checking = false;
let queue: Promise<unknown> = Promise.resolve();

function api(): ModelApi | null {
  const found = (globalThis as { LanguageModel?: ModelApi }).LanguageModel;
  return found ?? null;
}

function set(next: LocalAiState, nextProgress = progress) {
  if (state === next && progress === nextProgress) return;
  state = next;
  progress = nextProgress;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Looks once per page load; cheap, and does not start a download. */
export function checkLocalAi() {
  if (checking || state !== "unknown") return;
  checking = true;
  const model = api();
  if (!model) { set("unavailable"); checking = false; return; }
  model.availability(OPTIONS).then((value) => set(value), () => set("unavailable")).finally(() => { checking = false; });
}

export function getLocalAiState() { return state; }
export function getLocalAiProgress() { return progress; }

export function subscribeLocalAi(onChange: () => void) {
  checkLocalAi();
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Starts the one-time model download. Must be called from a click, as Chrome requires. */
export async function prepareLocalAi() {
  const model = api();
  if (!model) { set("unavailable"); return false; }
  try {
    if (state === "available") return true;
    set("downloading", 0);
    const session = await model.create({ ...OPTIONS, monitor(monitor: EventTarget) {
      monitor.addEventListener("downloadprogress", (event) => set("downloading", Math.min(1, Number((event as Event & { loaded?: number }).loaded ?? 0))));
    } });
    session.destroy();
    set("available", 1);
    return true;
  } catch {
    set("downloadable", 0);
    return false;
  }
}

export const AI_REPLY_SCHEMA = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["recall", "why", "cloze", "choice", "scenario"] },
          prompt: { type: "string" },
          modelAnswer: { type: "string" },
          hint: { type: "string" },
          explanation: { type: "string" },
          sourceQuote: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
        },
        required: ["kind", "prompt", "modelAnswer", "sourceQuote"],
      },
    },
  },
  required: ["explanation", "items"],
} as const;

/** One question-writing request, run one at a time: the on-device model handles a single request at once. */
export function generateLocally(system: string, user: string, timeoutMs = 90_000): Promise<string | null> {
  const run = async () => {
    const model = api();
    if (!model || state !== "available") return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let session: ModelSession | null = null;
    try {
      session = await model.create({ ...OPTIONS, initialPrompts: [{ role: "system", content: system }], temperature: 0.3, topK: 20 });
      return await session.prompt(user, { responseConstraint: AI_REPLY_SCHEMA, signal: controller.signal });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      session?.destroy();
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => null);
  return next;
}
