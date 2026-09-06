const STORAGE_KEY = "kelus:waitlist:v1";

export type WaitlistEntry = {
  email: string;
  source: string;
  note?: string;
  createdAt: string;
};

function readEntries(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as WaitlistEntry[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: WaitlistEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-100)));
  } catch {
    // Waitlist capture must never break the page.
  }
}

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidWaitlistEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeWaitlistEmail(email));
}

export async function submitWaitlistSignup(input: {
  email: string;
  source?: string;
  note?: string;
}): Promise<{ ok: true; duplicate?: boolean } | { ok: false; error: string }> {
  const email = normalizeWaitlistEmail(input.email);
  if (!isValidWaitlistEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const entry: WaitlistEntry = {
    email,
    source: input.source?.trim() || "waitlist",
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const existing = readEntries();
  const duplicate = existing.some((item) => item.email === email);
  if (!duplicate) writeEntries([...existing, entry]);

  const endpoint = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT?.trim();
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: entry.email,
          source: entry.source,
          note: entry.note,
          createdAt: entry.createdAt,
        }),
        keepalive: true,
      });
      if (!response.ok) {
        return { ok: false, error: "Couldn’t reach the waitlist service. Try again in a moment." };
      }
    } catch {
      return { ok: false, error: "Couldn’t reach the waitlist service. Try again in a moment." };
    }
  }

  return { ok: true, duplicate };
}

export function readWaitlistEntries() {
  return readEntries();
}
