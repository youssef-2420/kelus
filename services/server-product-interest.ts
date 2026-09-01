import { normalizeSearchQuery } from "../lib/normalize-search-query.ts";

export type ProductInterestDatabase = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run?(): Promise<unknown>;
      first?<T>(): Promise<T | null>;
      all?<T>(): Promise<{ results?: T[] }>;
    };
  };
};

type StoreInput = {
  query: string;
  email?: string;
  userId?: string;
  userEmail?: string;
  source?: string;
};

type StoreResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; code: "invalid_query" | "invalid_email" | "storage_unavailable" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveEmail(input: StoreInput) {
  const email = (input.userEmail ?? input.email ?? "").trim().toLowerCase();
  return emailPattern.test(email) ? email : null;
}

async function hasActiveRequest(database: ProductInterestDatabase, normalizedQuery: string, userId: string | null, email: string) {
  const statement = userId
    ? database.prepare(`SELECT id FROM product_interest_requests
      WHERE normalized_query = ? AND user_id = ? AND notified_at IS NULL
      LIMIT 1`).bind(normalizedQuery, userId)
    : database.prepare(`SELECT id FROM product_interest_requests
      WHERE normalized_query = ? AND email = ? AND notified_at IS NULL
      LIMIT 1`).bind(normalizedQuery, email);
  if (!statement.first) return false;
  return Boolean(await statement.first<{ id: number }>());
}

export async function storeProductInterestRequest(
  database: ProductInterestDatabase | undefined,
  input: StoreInput,
  now = new Date(),
): Promise<StoreResult> {
  if (!database) return { ok: false, code: "storage_unavailable" };
  const normalizedQuery = normalizeSearchQuery(input.query);
  if (!normalizedQuery || normalizedQuery.length < 2) return { ok: false, code: "invalid_query" };
  const email = resolveEmail(input);
  if (!email) return { ok: false, code: "invalid_email" };
  const userId = input.userId?.trim() || null;
  const source = input.source?.trim().slice(0, 48) || "unsupported_search";
  if (await hasActiveRequest(database, normalizedQuery, userId, email)) return { ok: true, duplicate: true };
  const insert = database.prepare(`INSERT INTO product_interest_requests (
    normalized_query, raw_query, email, user_id, source, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(normalizedQuery, input.query.trim().slice(0, 160), email, userId, source, now.toISOString());
  if (!insert.run) return { ok: false, code: "storage_unavailable" };
  await insert.run();
  return { ok: true, duplicate: false };
}

export async function listTopProductInterestRequests(
  database: ProductInterestDatabase | undefined,
  since: string,
  limit = 10,
) {
  if (!database) return [];
  const statement = database.prepare(`SELECT normalized_query AS label, COUNT(*) AS count
    FROM product_interest_requests
    WHERE created_at >= ? AND notified_at IS NULL
    GROUP BY normalized_query
    ORDER BY count DESC
    LIMIT ?`).bind(since, Math.max(1, Math.min(25, Math.floor(limit))));
  if (!statement.all) return [];
  const response = await statement.all<{ label: string; count: number }>();
  return (response.results ?? []).map((row) => ({ label: row.label, count: Number(row.count) }));
}
