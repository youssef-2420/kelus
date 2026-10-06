/**
 * The on-device model built into recent Chrome (the Prompt API). No key, no server, nothing leaves the device.
 * Everything here is optional: where it is missing the offline questions are used, exactly as before.
 */

type ModelSession = { prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>; destroy(): void };
type ModelApi = {
  availability(options?: object): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(options?: object): Promise<ModelSession>;
};

/** Smaller than this cannot hold a page of notes plus the instructions and a few questions. */
const MIN_CONTEXT_TOKENS = 3000;

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
  model.availability(OPTIONS).then((value) => {
    // "Available" is only believed after a real answer: some browsers expose the API with no model behind it.
    if (value === "available") return verifyModel(model).then((real) => set(real ? "available" : "unavailable"));
    set(value);
  }, () => set("unavailable")).finally(() => { checking = false; });
}

export function getLocalAiState() { return state; }
export function getLocalAiProgress() { return progress; }

export function subscribeLocalAi(onChange: () => void) {
  checkLocalAi();
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Asks one tiny question. A stand-in that echoes its input, or a window too small to be useful, is not a model we can use. */
async function verifyModel(model: ModelApi) {
  let session: (ModelSession & { contextWindow?: number }) | null = null;
  try {
    session = await model.create(OPTIONS) as ModelSession & { contextWindow?: number };
    if (typeof session.contextWindow === "number" && session.contextWindow < MIN_CONTEXT_TOKENS) return false;
    const question = "Reply with only the word: yes";
    const answer = (await session.prompt(question)).trim().toLocaleLowerCase();
    return answer.length > 0 && answer.length < 40 && !answer.includes("not available") && !answer.includes("echo") && !answer.includes(question.toLocaleLowerCase());
  } catch {
    return false;
  } finally {
    session?.destroy();
  }
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
    const real = await verifyModel(model);
    set(real ? "available" : "unavailable", 1);
    return real;
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
