# Kelus — overall audit

**Date:** 9 September 2026  
**Baseline:** `main` @ `e382e1c` (kelus.me static Next.js export)  
**Also reviewed:** open PRs #84 (Exam Pass + harden), #85 (weaknesses-only), #87 (site visuals)  
**Method:** code review, prior audit synthesis, route smoke checks, `npm test` (90 pass on site-visuals tree; main parity assumed for core suites)

This is a **scored product audit**, not a changelog. Open PRs are noted where they would move a score if merged.

---

## Verdict

Kelus is a **coherent local-first exam-revision tool** with an honest learning loop, a clear indigo-ledger craft direction, and stronger trust copy than most early student apps. It is **shipable for a cold student on one device**.

It is **not yet a paid product**. Monetization either sells “priority support” nobody needs (#main) or a remaining-day plan unlocked by a forgeable `?pass=1` (#84). First-run on a real syllabus is still long and OCR-fragile. EU analytics consent and verified entitlements are missing.

| | |
| --- | --- |
| **Overall mark** | **6.4 / 10** |
| **Letter** | **C+** |
| **Readiness** | Pilot / friends-and-founders — not unattended paid production |

---

## Scorecard

| Dimension | Mark | One-line |
| --- | --- | --- |
| Product vision & honesty | **8.0** | Clear job-to-be-done; readiness is an estimate; engine labeled heuristic |
| Core learning loop | **7.5** | Setup → materials → diagnosis → Today → session actually works |
| Time-to-value / first run | **5.0** | Sample (~1 min) saves it; real PDF/OCR path churns |
| UX & visual craft | **7.0** | Ledger home/demo strong; `globals.css` still multi-era; empties mostly recover |
| Accessibility | **7.5** | Skip link, focus tokens, 44px locks, reduced-motion mostly respected |
| Monetization | **3.5** | Free already full; $9 buys support (main) or forgeable calendar/ICS (#84) |
| Trust, legal, privacy | **6.0** | Good privacy honesty; GA consent granted by default; terms thin on paid |
| Security & ops | **5.5** | RLS on live sync tables; static export limits; no CSP; FormSubmit open |
| Engineering & tests | **7.5** | Domain + trust contract tests; e2e first-use; huge CSS is the main debt |
| Growth / distribution | **5.0** | SEO on public pages OK; conversion depends on sample + manual Stripe ops |

**Weighted overall: 6.4 / 10 (C+).**

Weighting favors product truth (vision, loop, honesty) over polish. Monetization and first-run drag the mark hardest.

---

## What Kelus is

Local-first exam revision: set an exam, confirm concepts from *your* PDF, diagnose, follow today’s route, then Learn → Retrieve → Apply with inspectable source evidence. Optional Supabase sync. Static export to kelus.me.

Surfaces: `/` · `/today` · `/materials` · `/session` · `/map` · `/pricing` · `/waitlist` · `/questions` · `/privacy` · `/terms` · `/route`.

Engine: `kelus-mvp-heuristic-v1` — heuristics, not a published memory-science model.

---

## What’s already strong

1. **Honest product frame** — sample path, OCR limits, readiness as estimate, waitlist/questions local fallbacks.
2. **Real loop, not a brochure** — domain routing, diagnosis, answer evaluation, material intelligence exist and are tested.
3. **Local-first by default** — guest vs account keys isolated; cloud optional; no service-role in the client.
4. **Trust regressions locked** — `tests/audit-harden`, `trust-surfaces`, stick-under-eight / nine-blocker style gates.
5. **Craft direction** — `design.md` + indigo ledger; student illustration as owned identity; motion via `motion/react`, bounce 0.
6. **Public SEO / private app** — metadata, sitemap; app layouts `noindex`.

---

## Critical gaps (ordered by leverage)

### 1. Monetization is not real yet — **Critical**

**On `main` today:** Free includes the full revision loop (+ optional sync). Exam Pass ($9) sells priority support and “launch features.” Nothing a stressed student would choose over free.

**On PR #84:** Exam Pass becomes a remaining-day plan (named days, ICS, printable list). Better *story*, but unlock is `?pass=1` + `localStorage` — forgeable, not restoreable across devices, honor-system for a static site.

**Mark impact:** holds Monetization at ~3.5 even after #84 until a Worker/webhook entitlement exists.

### 2. Real-course first run is still too long — **High**

Default path: setup → materials → OCR/confirm → diagnosis → Today → session. Sample (~1 min) is the honest fast path. OCR cliffs (weak text, page/time/language caps) push students off *their* syllabus into the demo — which abandons personalization and any pay moment.

### 3. Analytics consent defaults to granted — **High** (EU/UK)

GA loads with `analytics_storage: "granted"` when the measurement ID is set. Privacy describes analytics; there is no opt-in UI. Do not claim EU-ready privacy until this flips.

### 4. Paid terms / restore / support SLA missing — **High** if you take money

Terms barely mention Exam Pass. No verified purchase restore. “Email through exam day” does not scale and is hard to prove you kept.

### 5. Design-system debt — **Medium**

`design.md` is indigo; `app/globals.css` is still ~8k+ lines with green-era tokens, dead home eras, and leftover shadcn dark blocks. Marketing and product can look like two products under parallel PRs (#72/#71 ledger, #87 visuals).

### 6. Hosting security incomplete — **Medium**

Static export cannot set headers in Next itself. #84 adds Cloudflare `_headers` (nosniff, frame deny, referrer) but **no CSP**, and `workers_dev` may still publish a second origin. Legacy SQL 001/002 without RLS remains a production footgun if ever applied.

---

## Dimension notes

### Product vision & honesty — 8.0

Clear: revise *your* lessons for *your* exam. Copy and empty states generally refuse grade-prediction theater. Keep that discipline when selling Exam Pass coverage numbers.

### Core learning loop — 7.5

The loop is real and measurable. Weakest link is material quality → concept quality → route quality, not missing screens.

### Time-to-value — 5.0

Sample rescues conversion demos. Friends with messy lecture scans will bounce. Manual concept entry when OCR dies should be first-class.

### UX & visual craft — 7.0

Hero/demo and staged empties are improving (#87). Product chrome is ledger-ish but uneven. Avoid another full redesign pass before distilling CSS.

### Accessibility — 7.5

Solid foundations and test locks. Remaining gaps are mostly per-control (dialogs, session chrome) — #84 closes several.

### Monetization — 3.5

Structural: static site + Payment Link cannot prove payment. Product: free already does the job. #84 improves the pitch; it does not fix entitlement.

### Trust / legal / privacy — 6.0

Privacy is unusually candid for an MVP. Consent and paid terms lag. Shared-device CSV export still one click.

### Security & ops — 5.5

Good data isolation story for the architecture you chose. Incomplete edge headers, open FormSubmit, no CSP, client-only paywall.

### Engineering & tests — 7.5

Above-average for a solo MVP: domain tests, sync ownership tests, e2e first-use. Debt is concentration in one CSS megafile and multi-branch design divergence.

### Growth — 5.0

Homepage story is clearer. Funnel still: land → sample or long setup → maybe waitlist. Paid conversion is not instrumented end-to-end on every CTA.

---

## Open PR map (do not double-count)

| PR | Branch | Effect on mark if merged cleanly |
| --- | --- | --- |
| [#84](https://github.com/youssef-2420/kelus/pull/84) | `cursor/kelus-audit-444f` | +0.3–0.5 (chrome, a11y, headers, better Exam Pass *story*) — monetization still capped by forgeable unlock |
| [#85](https://github.com/youssef-2420/kelus/pull/85) | `cursor/weaknesses-only-444f` | Docs only — no score change |
| [#87](https://github.com/youssef-2420/kelus/pull/87) | `cursor/site-visuals-444f` | +0.1–0.2 craft on home; watch conflict with ledger PRs |
| #86 / #72 / #71 / #70 | visuals / ledger / today | Craft & IA — merge carefully to avoid CSS thrash |

**Optimistic ceiling if #84 + #87 land and entitlement is still client-side:** ~**6.8 / 10**.  
**Path to 8+:** verified Exam Pass, shorter real-course first run, consent-gated GA, CSS distill, CSP.

---

## Highest-leverage next three

1. **Verified entitlement** (Stripe webhook + account/email redeem) — or stop selling Exam Pass as a product.
2. **Manual concepts when OCR fails** — keep students on *their* course.
3. **Consent-gated analytics** — default denied + a real choice.

---

## Mark

### **6.4 / 10 — C+**

**Meaning:** Strong early product with a real study loop and unusual honesty. Weak as a business and incomplete as a paid, multi-device, EU-ready service.

| Band | Score | Kelus fits? |
| --- | --- | --- |
| A (8.5–10) | Production-grade paid tool | No |
| B (7.0–8.4) | Solid beta you’d recommend widely | Not yet |
| **C (5.5–6.9)** | **Credible pilot; fix monetization + first-run** | **Yes** |
| D (4.0–5.4) | Demo / brochure | No — loop is real |
| F (&lt;4) | Not shipable | No |
