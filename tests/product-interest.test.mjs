import assert from "node:assert/strict";
import test from "node:test";
import { storeProductInterestRequest } from "../services/server-product-interest.ts";

class InterestStatement {
  constructor(rows = []) {
    this.rows = rows;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    return this.rows[0] ?? null;
  }
  async run() {
    if (this.values.length >= 6) this.rows.push({ id: this.rows.length + 1 });
    return {};
  }
}

test("product interest requests normalize, validate email, and deduplicate active requests", async () => {
  const rows = [];
  const database = {
    prepare(sql) {
      if (sql.includes("SELECT id")) return new InterestStatement(rows);
      return new InterestStatement(rows);
    },
  };
  const first = await storeProductInterestRequest(database, { query: "  Dyson Headphones!!! ", email: "shopper@example.com" }, new Date("2026-08-28T12:00:00Z"));
  assert.deepEqual(first, { ok: true, duplicate: false });
  const duplicate = await storeProductInterestRequest(database, { query: "dyson headphones", email: "shopper@example.com" }, new Date("2026-08-28T12:01:00Z"));
  assert.deepEqual(duplicate, { ok: true, duplicate: true });
  const invalid = await storeProductInterestRequest(database, { query: "dyson headphones", email: "not-an-email" });
  assert.deepEqual(invalid, { ok: false, code: "invalid_email" });
  assert.equal(rows.length, 1);
});
