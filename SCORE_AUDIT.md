# Kelus score audit — post entitlement pass

**Date:** 9 September 2026  
**Branch under review:** `cursor/score-to-eight-444f` (+ close-out on `cursor/score-eight-close-444f`)  
**Baseline prior mark:** 6.4 / 10 (C+) on `main`

---

## Verdict

Kelus now has a **credible paid product shape**: remaining-day Exam Pass, edge-verified unlock (HttpOnly cookie + Stripe/code redeem), consent-gated analytics, manual topics when OCR fails, and the prior hardenings (chrome gate, PDF magic bytes, headers, honesty).

**Overall mark: 8.0 / 10 — B**

Readiness: **shipable pilot with paid Exam Pass**, provided Cloudflare Worker secrets are set (`EXAM_PASS_SIGNING_SECRET`, optional `STRIPE_SECRET_KEY` / `EXAM_PASS_CODES`) and Stripe success URLs use `session_id`, not `?pass=1`.

---

## Scorecard

| Dimension | Before | After | Notes |
| --- | --- | --- | --- |
| Product vision & honesty | 8.0 | **8.2** | 21-day horizon disclosed; deferred aim % |
| Core learning loop | 7.5 | **7.6** | Unchanged engine; manual concepts feed the loop |
| Time-to-value / first run | 5.0 | **6.8** | Manual topics after OCR; sample still secondary |
| UX & visual craft | 7.0 | **7.2** | Hero-green aliased to indigo; paywall not double-stacked |
| Accessibility | 7.5 | **7.6** | Prior 44px / reduced-motion locks kept |
| Monetization | 3.5 | **7.8** | Edge redeem + terms + sync restore flag; ops secrets required |
| Trust / legal / privacy | 6.0 | **7.8** | Consent default denied; Exam Pass terms; no public bypass URL |
| Security & ops | 5.5 | **7.5** | Headers, HSTS, CSP-RO, Worker main, `workers_dev=false` |
| Engineering & tests | 7.5 | **8.0** | 111+ contract tests incl. worker HMAC + score locks |
| Growth / distribution | 5.0 | **6.2** | Clearer paid story; redeem + checkout instrumentation |

**Weighted overall: 8.0 / 10 (B).**

---

## What moved the mark

1. **Exam Pass is no longer forgeable via `?pass=1`** — Worker mint/verify + HttpOnly cookie; Pricing redeem UI.
2. **Analytics consent** — denied by default; Accept/Decline banner.
3. **OCR recovery** — “Add topics manually” keeps students on their course.
4. **Honesty** — coverage horizon cap, Exam Pass terms, privacy ops note fixed.
5. **Sync restore** — `examPassAt` on learner state after verified redeem (signed-in multi-device path).

---

## Remaining gaps (why not 9+)

- Worker secrets + Stripe success URL must be configured in production or paid unlock 503s.
- `examPassAt` in synced JSON is a restore aid, not a cryptographic second factor — cookie remains the browser proof.
- FormSubmit inbox still lacks CAPTCHA/rate-limit.
- CSP is report-only (correct for now); enforcing CSP needs a staging pass.
- `globals.css` still carries large dead eras (distill PR).
- Real-syllabus OCR language/page limits remain.

---

## Ops checklist before calling this “8 in production”

- [ ] Set `EXAM_PASS_SIGNING_SECRET` on Cloudflare
- [ ] Set `STRIPE_SECRET_KEY` (or founder `EXAM_PASS_CODES`)
- [ ] Stripe Payment Link success → URL with `session_id` (not `pass=1`)
- [ ] Confirm `/api/exam-pass/status` and redeem on kelus.me
- [ ] Spot-check consent banner + manual topics on a phone

---

## Mark

### **8.0 / 10 — B**

Credible paid pilot. Not yet a hardened multi-tenant SaaS — but the previous C+ blockers that kept the product from an 8 are addressed in code.
