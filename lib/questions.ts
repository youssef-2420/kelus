const STORAGE_KEY = "kelus:questions:v1";
const LAST_REMOTE_KEY = "kelus:questions:last-remote-at";
const DEFAULT_QUESTIONS_INBOX = "hello@kelus.me";
/** FormSubmit delivers browser POSTs to the inbox without a GitHub secret. */
const DEFAULT_QUESTIONS_ENDPOINT = `https://formsubmit.co/ajax/${DEFAULT_QUESTIONS_INBOX}`;

export type QuestionEntry = {
  name: string;
  email: string;
  question: string;
  source: string;
  createdAt: string;
};

export type QuestionDelivery = "remote" | "local" | "needs_activation";

export function questionsInboxEmail() {
  return DEFAULT_QUESTIONS_INBOX;
}

export function questionsEndpoint() {
  return process.env.NEXT_PUBLIC_QUESTIONS_ENDPOINT?.trim() || DEFAULT_QUESTIONS_ENDPOINT;
}

export function questionsEndpointConfigured() {
  // Always deliverable: custom endpoint or default FormSubmit → hello@kelus.me.
  return Boolean(questionsEndpoint());
}

function readEntries(): QuestionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as QuestionEntry[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: QuestionEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-100)));
  } catch {
    // Question capture must never break the page.
  }
}

function markRemoteDelivery(atIso = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_REMOTE_KEY, atIso);
  } catch {
    /* Optional proof signal. */
  }
}

export function lastRemoteQuestionDeliveryAt() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_REMOTE_KEY);
  } catch {
    return null;
  }
}

export function normalizeQuestionEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidQuestionEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeQuestionEmail(email));
}

function isFormSubmitEndpoint(endpoint: string) {
  return /formsubmit\.co/i.test(endpoint);
}

function isActivationFailure(message = "") {
  return /activate|confirm your email|disabled|not activated/i.test(message);
}

export async function submitClientQuestion(input: {
  name: string;
  email: string;
  question: string;
  source?: string;
}): Promise<{ ok: true; delivery: QuestionDelivery } | { ok: false; error: string }> {
  const name = input.name.trim();
  const email = normalizeQuestionEmail(input.email);
  const question = input.question.trim();

  if (name.length < 2) {
    return { ok: false, error: "Enter your name so we know who to reply to." };
  }
  if (!isValidQuestionEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (question.length < 8) {
    return { ok: false, error: "Write a short question — a sentence is enough." };
  }
  if (question.length > 2000) {
    return { ok: false, error: "Keep the question under 2,000 characters." };
  }

  const entry: QuestionEntry = {
    name,
    email,
    question,
    source: input.source?.trim() || "questions",
    createdAt: new Date().toISOString(),
  };

  writeEntries([...readEntries(), entry]);

  const endpoint = questionsEndpoint();
  const payload = isFormSubmitEndpoint(endpoint)
    ? {
        name: entry.name,
        email: entry.email,
        message: entry.question,
        question: entry.question,
        source: entry.source,
        createdAt: entry.createdAt,
        _subject: `Kelus question from ${entry.name}`,
        _replyto: entry.email,
        _template: "table",
      }
    : {
        type: "client_question",
        name: entry.name,
        email: entry.email,
        question: entry.question,
        source: entry.source,
        createdAt: entry.createdAt,
      };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!response.ok) {
      return { ok: true, delivery: "local" };
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean | string; message?: string; error?: string }
        | null;
      if (body) {
        const message = `${body.message ?? ""} ${body.error ?? ""}`.trim();
        if (isActivationFailure(message)) {
          return { ok: true, delivery: "needs_activation" };
        }
        const failed =
          body.success === false
          || body.success === "false"
          || Boolean(body.error);
        if (failed) return { ok: true, delivery: "local" };
      }
    }
  } catch {
    return { ok: true, delivery: "local" };
  }

  markRemoteDelivery(entry.createdAt);
  return { ok: true, delivery: "remote" };
}

export function readQuestionEntries() {
  return readEntries();
}

export function exportQuestionsCsv(entries = readEntries()) {
  const header = "name,email,question,source,createdAt";
  const rows = entries.map((entry) =>
    [entry.name, entry.email, entry.question, entry.source, entry.createdAt]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function downloadQuestionsCsv(filename = `kelus-questions-${new Date().toISOString().slice(0, 10)}.csv`) {
  if (typeof document === "undefined") return 0;
  const entries = readEntries();
  if (!entries.length) return 0;
  const blob = new Blob([exportQuestionsCsv(entries)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return entries.length;
}
