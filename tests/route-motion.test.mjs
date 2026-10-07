import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The browser's page-transition effect delayed Today → session by up to a second on a throttled phone
// (measured: 250 ms to 1.1 s with it, a steady ~110 ms without). The work routes stay free of it.
test("Today, the session and the session summary never use the page-transition wrappers", () => {
  for (const file of ["app/today/page.tsx", "app/session/page.tsx", "app/session/complete/page.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /PageTransition|LateralPage|SuspenseReveal|SuspenseFallbackExit|<ViewTransition/, `${file} must not wrap its page in a view transition`);
  }
});
