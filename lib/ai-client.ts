import { generateLocally, getLocalAiState } from "@/lib/local-ai";
import { buildPrompt, mergeAiContent, validateAiReply, type AiTopicContent, type AiTopicInput } from "@/domain/ai-content";

/**
 * The app's side of the AI step. It does nothing unless a proxy address is configured at build time
 * AND the learner has switched it on. Any failure returns null, and the offline questions are used.
 */

const CONSENT_KEY = "kelus-ai-consent-v1";
const CONSENT_EVENT = "kelus-ai-consent";
const CACHE_PREFIX = "kelus-ai-topic-v1:";
const TIMEOUT_MS = 40_000;

export function aiEndpoint() {
  return (process.env.NEXT_PUBLIC_AI_ENDPOINT ?? "").trim();
}

export function aiConfigured() {
  return aiEndpoint().length > 0;
}

export function getAiConsent() {
  try { return window.localStorage.getItem(CONSENT_KEY) === "on"; } catch { return false; }
}

export function setAiConsent(on: boolean) {
  try {
    if (on) window.localStorage.setItem(CONSENT_KEY, "on");
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch { /* Consent is per browser; without storage it simply stays off. */ }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function subscribeAiConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Writing questions is possible: a configured service, or this browser's own on-device model, and the learner said yes. */
export function aiActive() {
  return getAiConsent() && (aiConfigured() || getLocalAiState() === "available");
}

function cacheKey(input: AiTopicInput) {
  let h = 2166136261;
  for (const ch of `${input.name}\n${input.pageText}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return CACHE_PREFIX + (h >>> 0).toString(36);
}

export function readCachedAi(input: AiTopicInput): AiTopicContent | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(input));
    return raw ? (JSON.parse(raw) as AiTopicContent) : null;
  } catch { return null; }
}

export function forgetAiContent() {
  try {
    for (const key of Object.keys(window.localStorage)) if (key.startsWith(CACHE_PREFIX)) window.localStorage.removeItem(key);
  } catch { /* Nothing stored, nothing to forget. */ }
}

/** Asks the proxy to write questions for one topic. Returns checked content, or null on any problem. */
export async function fetchAiTopicContent(input: AiTopicInput, options: { endpoint?: string; fetchImpl?: typeof fetch } = {}): Promise<AiTopicContent | null> {
  const endpoint = options.endpoint ?? aiEndpoint();
  if (input.pageText.trim().length < 40) return null;
  const cached = typeof window !== "undefined" ? readCachedAi(input) : null;
  if (cached) return cached;
  if (!endpoint) return fetchOnDevice(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPrompt(input)),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: unknown };
    if (typeof data.text !== "string") return null;
    const content = validateAiReply(data.text, input);
    if (content && typeof window !== "undefined") {
      try { window.localStorage.setItem(cacheKey(input), JSON.stringify(content)); } catch { /* Cache is optional. */ }
    }
    return content;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The same request, answered by the model in this browser. Slower, free, and private. */
async function fetchOnDevice(input: AiTopicInput): Promise<AiTopicContent | null> {
  const { system, user } = buildPrompt(input, { maxItems: 4 });
  const raw = await generateLocally(system, user);
  if (!raw) return null;
  const content = validateAiReply(raw, input);
  if (content && typeof window !== "undefined") {
    try { window.localStorage.setItem(cacheKey(input), JSON.stringify(content)); } catch { /* Cache is optional. */ }
  }
  return content;
}

/** Writes questions for the next few topics in the background, so they are ready the moment a session opens. */
export async function prefetchAiTopics(inputs: AiTopicInput[]) {
  for (const input of inputs) {
    if (!aiActive()) return;
    await fetchAiTopicContent(input);
  }
}

export { mergeAiContent };
