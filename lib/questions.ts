const STORAGE_KEY = "kelus:questions:v1";
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

export function normalizeQuestionEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidQuestionEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeQuestionEmail(email));
}

function isFormSubmitEndpoint(endpoint: string) {
  return /formsubmit\.co/i.test(endpoint);
}

export async function submitClientQuestion(input: {
  name: string;
  email: string;
  question: string;
  source?: string;
}): Promise<{ ok: true; delivery: "remote" | "local" } | { ok: false; error: string }> {
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
  } catch {
    return { ok: true, delivery: "local" };
  }

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
