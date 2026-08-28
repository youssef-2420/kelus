import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { optimizedRetailerImageUrl } from "../services/retailer-image.ts";

test("eBay listing thumbnails request a bounded image instead of the original large asset", () => {
  assert.equal(
    optimizedRetailerImageUrl("https://i.ebayimg.com/images/g/example/s-l1600.jpg", 300),
    "https://i.ebayimg.com/images/g/example/s-l300.jpg",
  );
  assert.equal(
    optimizedRetailerImageUrl("https://i.ebayimg.com/images/g/example/s-l225.jpg", 160),
    "https://i.ebayimg.com/images/g/example/s-l160.jpg",
  );
  assert.equal(optimizedRetailerImageUrl("https://example.com/product.jpg", 300), "https://example.com/product.jpg");
});

test("homepage search navigation has no artificial pre-navigation delay", async () => {
  const source = await readFile(new URL("../components/SearchControls.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setTimeout\(resolve,\s*220\)/);
  assert.doesNotMatch(source, /setTimeout\(resolve,\s*200\)/);
  assert.match(source, /window\.location\.assign/);
});
