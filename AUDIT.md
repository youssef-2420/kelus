# Kelus audit — 8 September 2026

Audit of the current `main` tree (`kelus.me` static Next.js export). Scope: product honesty, core loop, accessibility, security/data handling, and remaining drift after the Impeccable / harden / distill passes.

This pass **implements** the P0/P1 items marked “Fixed in this PR”. Follow-ups stay listed so they are not forgotten.

## Verdict

Kelus is a coherent local-first exam-revision product. The learning loop, honesty copy, and RLS-scoped cloud sync are in better shape than most early student tools. The remaining risk is not “does the engine exist?” — it is **first-run friction**, **signed-in chrome disappearing during sync**, and **hosting/privacy hardening** that a static export does not get for free.

**Readiness:** shipable for a cold student on one device. Not yet tight enough for shared-lab machines, EU analytics consent, or an unattended production incident.

## Product snapshot

Kelus helps a student revise *their* course material: set an exam, confirm concepts from a PDF, diagnose, follow today’s route, then retrieve/apply with inspectable evidence. The engine is explicitly `kelus-mvp-heuristic-v1` — heuristics, not a published memory-science model. Readiness is labeled as an estimate, not a grade.

| Surface | Role |
| --- | --- |
| `/` | Marketing home + product demo |
| `/today` | Hub: setup → diagnosis → route |
| `/materials` | PDF / bookmark ingest |
| `/map` | Knowledge Map |
| `/session` | Learn → retrieve → apply → evaluate |
| `/session/complete` | Summary, next route, calendar |
| `/pricing`, `/waitlist`, `/questions` | Monetization + inbox |
| `/privacy`, `/terms` | Legal |

Auth is optional Supabase. Without it, the full loop works on-device. Cloud tables in use are `learner_states`, `material_states`, and normalized `course_materials` (migrations 003–005). Migrations 001–002 describe a normalized schema that the app does **not** sync row-by-row.

## What is already strong

- Honest methodology: readiness disclaimers, OCR limits, bookmark-only links, waitlist/questions delivery fallbacks.
- Local-first default; guest vs account storage keys are isolated; guest state is not re-keyed into a different account.
- Active Supabase tables enable RLS with `auth.uid() = user_id`. No service-role key in the client or CI.
- No `dangerouslySetInnerHTML` except the GA bootstrap (measurement ID JSON-escaped).
- Contrast and 44px header/nav targets were locked by `tests/audit-harden.test.mjs`.
- Motion uses `motion/react` with bounce 0. Most product flows already call `useReducedMotion()`.
- Sitemap and `noindex` layouts keep `/today`, `/session`, `/map`, `/concepts` out of the public index.

## Findings

Severity: **P0** blocks a signed-in session or trust; **P1** is high-frequency friction or a real security gap; **P2** is polish or follow-up.

### P0 — Signed-in chrome vanished during scope sync

`LearnerProvider` replaced *all* children — including `SiteHeader` and the skip-link target — until learner and material owners matched the active user. A refresh or sign-in showed only “Loading your private learning route…”.

**Fixed in this PR:** header and skip target stay mounted. Only the page body is gated until scopes align. Cross-account flash protection is unchanged.

### P1 — Session spoke internal phase names

The step line rendered raw enums (`learn`, `retrieve`, `apply`, `evaluate`).

**Fixed in this PR:** Learn / Retrieve / Apply / Evaluate.

### P1 — Session-complete CTA said “tomorrow” on the same day

The primary button was “Open tomorrow’s Today” while the page already had “Open Today” and a “Come back tomorrow” section.

**Fixed in this PR:** primary CTA is “Back to Today”. Habit copy stays in the section above.

### P1 — Nav labels disagreed

Header: “Map”. Workspace rail: “Knowledge Map”. Different order too.

**Fixed in this PR:** rail label is “Map”. Page titles may still say Knowledge Map.

### P1 — `Reveal` ignored reduced motion

Homepage story sections always used a 500ms y/opacity transition.

**Fixed in this PR:** `useReducedMotion()` short-circuits the motion.

### P1 — Touch targets still 38–40px on session and dialog chrome

Header CTAs were 44px; session help, source close, auth close, compact CTAs, and the mobile secondary hero button were not.

**Fixed in this PR:** those controls are 44px.

### P1 — Map with a completed setup but no course had no recovery

`No active course.` was a bare paragraph.

**Fixed in this PR:** empty-state pattern with a “Set your exam” CTA.

### P1 — Missing security headers on kelus.me

`next.config.ts` static export cannot set headers. Cloudflare Workers (`wrangler deploy`) and GitHub Pages shipped no CSP/XFO/nosniff/referrer policy.

**Fixed in this PR:** `public/_headers` for the Cloudflare asset deploy (`restore-kelus-dns.yml`). GitHub Pages still will not honor `_headers` — keep Cloudflare as the kelus.me edge.

CSP is **not** shipped here. A wrong `script-src`/`connect-src` would break GA, Supabase, FormSubmit, pdf.js, and Tesseract. Add CSP on a staging Worker first.

### P1 — Checkout URL was not allowlisted

`NEXT_PUBLIC_EXAM_PASS_PAYMENT_LINK` was used as `href` with no host check. A bad CI secret would send students off Stripe.

**Fixed in this PR:** only `https://buy.stripe.com/…` is accepted.

### P1 — External bookmarks omitted `noopener`

**Fixed in this PR:** `rel="noopener noreferrer"` on material bookmarks and session source links.

### P1 — PDF accept was name/MIME only

A file named `.pdf` with non-PDF bytes still entered IndexedDB and extraction.

**Fixed in this PR:** `%PDF` magic-byte check before store/OCR.

### P1 — Waitlist notes were unbounded

Questions already cap at 2000 characters. Waitlist notes did not.

**Fixed in this PR:** 500-character cap.

### P1 — Analytics consent defaults to granted

GA4 loads with `analytics_storage: "granted"` when the measurement ID is set. No consent banner. Privacy copy describes analytics but not an opt-in.

**Follow-up:** default denied + a real consent control before shipping EU traffic as a product claim. Do not flip the default without UI.

### P1 — Public FormSubmit inbox

Default questions endpoint is a hardcoded public FormSubmit URL. No CAPTCHA or rate limit.

**Follow-up:** Formspree/Getform with Turnstile, or a tiny Worker proxy. Documented in `.env.example` already.

### P1 — Legacy SQL 001/002 has no RLS

If those tables were ever applied in production, PostgREST would expose them to any authenticated user.

**Follow-up:** in the Supabase dashboard, drop unused 001 tables or add `auth.uid()` policies. Do not apply 001 to a live project as-is.

### P2 — Exam Pass value is still support-shaped

Pricing promises “priority access to new study features” without naming what $9 buys *today* besides email support.

**Follow-up:** list two concrete launch benefits or drop the features line.

### P2 — Core loop is long before the first real session

Default path: setup → materials → confirm → diagnosis → today → session. Sample (~1 min) is the honest fast path. Keep it; do not hide it.

### P2 — Design drift in unused CSS

`design.md` is indigo ledger. `globals.css` still contains green-era hero tokens, `.dark` shadcn blocks, pills, and shadows on dead home components. Live homepage demo is mostly ledger-compliant.

**Follow-up:** delete unused hero CSS/components in a dedicated distill PR (high conflict risk).

### P2 — `shadcn` CLI in production dependencies

Not imported by app code. Supply-chain weight only.

**Fixed in this PR:** moved to `devDependencies`.

### P2 — Shared-device PII

Learner answers live in localStorage; PDFs in IndexedDB; waitlist/questions CSVs are one click on `/waitlist` and `/questions`.

**Fixed in this PR:** privacy page now states the shared-device risk. A founder PIN on CSV export is still a follow-up.

### P2 — `workers_dev = true`

Production wrangler config still publishes a `*.workers.dev` hostname.

**Follow-up:** `workers_dev = false` once preview deploys have another URL.

## Architecture notes

```
Browser (localStorage + IndexedDB)
        ↓ optional sign-in
Supabase Auth + learner_states JSON + course_materials + private PDF bucket
        ↓ next build -- output: export
out/ → Cloudflare Workers assets (kelus.me) and GitHub Pages artifact
```

There are no API routes, middleware, or server actions. Security is RLS + client validation + edge headers.

`database/001_core_learning.sql` is a future contract, not the live adapter. Treat it as documentation until a real row store ships.

## Test locks added

`tests/kelus-audit.test.mjs` pins: scope gate + header, phase labels, complete CTA, rail “Map”, Reveal reduced motion, payment allowlist, PDF magic bytes, waitlist note cap, `noopener`, `_headers`, robots disallows, privacy shared-device copy.

Existing suites (`audit-harden`, `learner-sync`, `stick-under-eight`, `trust-surfaces`) were updated where copy or structure changed.

## Recommended next audits (not this PR)

1. Staging CSP + report-only on Cloudflare.
2. Consent-gated GA for EU.
3. Confirm production Supabase has no un-RLS’d 001 tables.
4. PDF preview via PDF.js canvas instead of a native iframe.
5. Distill leftover homepage/CSS eras.
6. Watch 8–10 real syllabus uploads; the algorithm is still an MVP heuristic.
