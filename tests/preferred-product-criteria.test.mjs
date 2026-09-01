import assert from "node:assert/strict";
import test from "node:test";
import { findBestValidatedAlternative, shouldRedirectToValidatedAlternative } from "../lib/preferred-product-criteria.ts";

const anyCriteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" };
const newCriteria = { ...anyCriteria, condition: "new" };

test("findBestValidatedAlternative prefers a live nearby configuration", () => {
  const alternative = findBestValidatedAlternative(anyCriteria);
  assert.ok(alternative);
  assert.notEqual(alternative.condition, "any");
});

test("shouldRedirectToValidatedAlternative returns null when live offers already exist", () => {
  assert.equal(shouldRedirectToValidatedAlternative(newCriteria, true), null);
});

test("shouldRedirectToValidatedAlternative returns a different live configuration when needed", () => {
  const redirect = shouldRedirectToValidatedAlternative(anyCriteria, false);
  assert.ok(redirect);
  assert.notEqual(redirect.condition, anyCriteria.condition);
});
