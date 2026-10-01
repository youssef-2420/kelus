# Kelus weaknesses audit — Exam Pass remaining-day plan

**Scope:** Current product after Exam Pass remaining-day plan work. Weaknesses only.  
**Date:** 8 September 2026  
**Method:** Code review of pricing, Exam Pass unlock, coverage engine, Today / session-complete, FirstRunSetup, MaterialLibrary, privacy/terms, analytics, LearnerProvider, design tokens.

---

## 1. Product / why students churn or won’t convert

### Long free funnel before any “paid” moment of truth
- **Severity:** High  
- **Evidence:** `/today` gates on setup → materials → diagnosis before a route (`app/today/page.tsx` L64–99); FirstRunSetup then pushes `/materials` (`L66–71`); MaterialLibrary still requires PDF confirm + OCR path (`components/MaterialLibrary.tsx` L156–263, L476–524); InitialDiagnosis is another multi-step gate (`components/InitialDiagnosis.tsx`).  
- **Why it hurts:** Most cold students abandon before they ever see the remaining-day plan that Exam Pass sells. The paid object appears only after a session or three PDFs.  
- **Fix:** Surface a real remaining-day preview (with honest locks) immediately after exam date + one confirmed concept set, before diagnosis/session.

### Sample path trains the wrong habit
- **Severity:** High  
- **Evidence:** FirstRunSetup leads with “Try sample (~1 min)” as the primary CTA (`components/FirstRunSetup.tsx` L32–39); empty materials and OCR failures also push sample (`MaterialLibrary.tsx` L439–447, L542–544); `/today?sample=1` auto-loads demo (`app/today/page.tsx` L29–38).  
- **Why it hurts:** Students who “get” Kelus on Amina’s course never attach their own syllabus, so Exam Pass (course-specific calendar) has nothing personal to sell.  
- **Fix:** Keep sample as secondary; make the primary path one real syllabus upload with a hard time-box and clearer OCR escape hatches.

### “Remaining days” plan silently caps at 21 days
- **Severity:** High  
- **Evidence:** `EXAM_COVERAGE_MAX_DAYS = 21` (`domain/exam-coverage.ts` L7, L72); headlines still speak in full `remainingDays` and “would be left at this pace” (`L115–125`) even when seating only used the 21-day horizon.  
- **Why it hurts:** Midterms 4–8 weeks out get a truncated plan that overstates uncovered topics — students either distrust the product or under-study days 22+.  
- **Fix:** Either plan the full remaining horizon or change copy to “next 21 days” and stop calling overflow “left at this pace.”

### Locked days still leak the plan shape
- **Severity:** Medium  
- **Evidence:** Free users see day 0 fully named; locked days still show stop count + minutes (`components/ExamWeekPlan.tsx` L66–81); free headline already states seated/uncovered counts (`domain/exam-coverage.ts` L122–125`, SoftUpgradePrompt L44–47).  
- **Why it hurts:** The scare (“topics left”) and the calendar skeleton are free; paying mostly buys topic *names* on later days — easy to decide $9 isn’t worth it.  
- **Fix:** Gate the coverage verdict and day structure behind the pass, or ship a free teaser that is clearly incomplete (one locked row, no counts).

---

## 2. Monetization / why they won’t pay $9

### Exam Pass is a forgeable localStorage flag, not a purchase entitlement
- **Severity:** Critical  
- **Evidence:** Unlock is `localStorage.setItem(examPassStorageKey…)` (`lib/exam-pass.ts` L23–40); return URL `?pass=1` / `exam_pass=success` activates with zero payment proof (`components/ExamPassCapture.tsx` L13–21; `isExamPassReturnQuery` L14–16); privacy literally publishes the success URL (`app/privacy/page.tsx` L87–90). No Stripe webhook, no server entitlement table.  
- **Why it hurts:** Anyone can unlock without paying; paying customers get the same brittle client flag. Revenue and trust both collapse.  
- **Fix:** Verify checkout server-side (webhook / Checkout Session) and store a signed entitlement keyed to account or device; treat query params as UX only.

### Paid unlock does not survive device change or cleared site data
- **Severity:** Critical  
- **Evidence:** Pass lives only in browser storage (`lib/exam-pass.ts`); `claimGuestExamPass` only copies guest→same-browser user id (`L43–55`); LearnerProvider syncs learner/materials to Supabase but never persists Exam Pass remotely (`components/LearnerProvider.tsx` L71–175). Pricing still sells “Direct email through exam day” (`app/pricing/page.tsx` L59) with no purchase↔exam binding.  
- **Why it hurts:** A student who pays $9, clears cookies, or opens another laptop loses the product they bought — chargebacks and “Kelus stole my money” emails.  
- **Fix:** Tie Exam Pass to a signed-in account (or email receipt redeem) and restore on sync; document refund path.

### Checkout is optional in the build; soft paywall is permanently dismissible
- **Severity:** High  
- **Evidence:** Without `NEXT_PUBLIC_EXAM_PASS_PAYMENT_LINK`, CTAs degrade to waitlist/email (`components/FoundingCta.tsx` L35–50; `ExamWeekPlan.tsx` L110–113); SoftUpgradePrompt “Not now” writes `kelus:paywall:dismissed:v1` forever (`SoftUpgradePrompt.tsx` L11, L49–56); soft-paywall checkout link does not even fire `exam_pass_checkout_clicked` (`L66–68` vs FoundingCta L23).  
- **Why it hurts:** Misconfigured deploys cannot take money; one dismiss kills every future upsell; funnel analytics undercount intent.  
- **Fix:** Fail CI if payment link missing on production; re-prompt on stronger moments; track every checkout click.

### Value prop vs free tier is thin after the remaining-day reveal
- **Severity:** High  
- **Evidence:** Free already includes full Today route, diagnosis, sessions, optional sync (`app/pricing/page.tsx` L32–45); Exam Pass adds named later days + ICS + printable list (`L54–60`, `ExamWeekPlan.tsx` L89–97). Coverage *headline* is free on Today and session complete (`app/today/page.tsx` L226–238; `app/session/complete/page.tsx` L120–128).  
- **Why it hurts:** Students already know whether they are behind; $9 buys labels and files, not a clearly better outcome.  
- **Fix:** Put a must-have daily workflow (reminders that actually fire, multi-device plan, or adaptive replan after failures) behind the pass — not just text export.

---

## 3. Trust / honesty / legal / privacy gaps

### Terms ignore paid Exam Pass entirely
- **Severity:** High  
- **Evidence:** `app/terms/page.tsx` covers product, accounts, availability, limitation — zero mention of Exam Pass, Stripe, refunds, “one exam / one payment,” or entitlement duration (updated Sep 7; privacy updated Sep 8 for Exam Pass).  
- **Why it hurts:** Paying students have no contract language if unlock fails, exam date changes, or the plan is wrong.  
- **Fix:** Add Exam Pass purchase terms: what is delivered, what is not guaranteed, refund window, and how unlock is restored.

### Analytics consent defaults to granted with no UI
- **Severity:** High  
- **Evidence:** GA bootstrap sets `analytics_storage: "granted"` (`components/GoogleAnalytics.tsx` L12–16); page views fire automatically (`GoogleAnalyticsPageViews.tsx` L10–17); privacy describes GA but not opt-in (`app/privacy/page.tsx` L72–76).  
- **Why it hurts:** EU/UK traffic is non-compliant; privacy copy overclaims control.  
- **Fix:** Default consent denied; show a real choice before any `gtag` config/events.

### Privacy documents the unpaid unlock URL
- **Severity:** Medium  
- **Evidence:** `app/privacy/page.tsx` L87–90 tells operators (and every reader) to use `https://kelus.me/today/?pass=1`. Combined with client-side activate, this is a public bypass recipe.  
- **Why it hurts:** Honest ops note becomes a piracy instruction.  
- **Fix:** Remove the raw success query from public privacy; document webhook redeem only in internal ops.

### Shared-device PII still one click away
- **Severity:** Medium  
- **Evidence:** Waitlist CSV export has no auth/PIN (`components/WaitlistExport.tsx` L11–32); questions/waitlist backups in `localStorage` (`lib/waitlist.ts`, `lib/questions.ts`); privacy admits shared-browser risk (`app/privacy/page.tsx` L93–97) but product still offers open export.  
- **Why it hurts:** Lab/library machines leak other students’ emails.  
- **Fix:** Gate export behind a founder secret or remove public export from production UI.

---

## 4. UX / a11y / first-run friction

### OCR / scan path is a churn cliff for real syllabi
- **Severity:** High  
- **Evidence:** OCR only after weak text, max 8 pages / 45s / English-biased (`MaterialLibrary.tsx` L202–232, L398–401); empty OCR throws and pushes sample (`L226–231`, L432–442); text extract capped at 16 pages (`L170`; `lib/pdf-extraction.ts` L91).  
- **Why it hurts:** Lecture scans and non-English notes — common student reality — fail into “try the sample,” which abandons personalization.  
- **Fix:** Offer manual concept entry as a first-class path when OCR fails; widen language/page limits or say clearly what files will fail before upload.

### Soft upgrade and Exam Week compete with the study moment
- **Severity:** Medium  
- **Evidence:** SoftUpgradePrompt on first session complete and third PDF (`app/session/complete/page.tsx` L129; `MaterialLibrary.tsx` L269–277, L389); full ExamWeekPlan also on Today and complete (`today/page.tsx` L226–238; complete L120–128).  
- **Why it hurts:** Right after finishing a session, attention should be “come back tomorrow,” not a second paywall stack (plan + soft upgrade + waitlist from session 2+).  
- **Fix:** One monetization surface per screen; defer soft upgrade until calendar download intent.

### First-run form still asks for aim % before any evidence
- **Severity:** Medium  
- **Evidence:** FirstRunSetup collects `targetPercent` default 85 (`components/FirstRunSetup.tsx` L9, L59–72) before materials exist; Today then displays “Est. readiness” vs that aim (`app/today/page.tsx` L190–207) from heuristic mastery (`domain/readiness.ts` L3–8; `ALGORITHM_KIND` in `domain/constants.ts` L5).  
- **Why it hurts:** Students set a grade target, then see an early % that looks like progress toward it — even with disclaimers, the UI frame invites over-trust and disappointment.  
- **Fix:** Defer target % until after diagnosis, or hide readiness % until N retrievals exist.

---

## 5. Engineering / security / reliability

### Static export + client-only paywall cannot be made honest without a backend
- **Severity:** Critical  
- **Evidence:** `next.config.ts` `output: "export"`; no API routes/webhooks; payment is a public Stripe Payment Link (`lib/founding.ts`); unlock is client-side (`ExamPassCapture.tsx`).  
- **Why it hurts:** You cannot prove payment, revoke abuse, or restore buys across devices. Monetization is structurally insecure.  
- **Fix:** Add a minimal Worker/API for Stripe webhooks + entitlement lookup before marketing Exam Pass as sold.

### Security headers incomplete; `workers_dev` still on
- **Severity:** High  
- **Evidence:** `public/_headers` has nosniff/XFO/referrer/Permissions/COOP but **no CSP** and no HSTS; `wrangler.toml` L3 `workers_dev = true` still publishes `*.workers.dev`.  
- **Why it hurts:** XSS blast radius for GA/Supabase scripts; accidental second public origin for the same assets.  
- **Fix:** Ship report-only CSP on Cloudflare, then enforce; set `workers_dev = false` once previews have another URL.

### FormSubmit questions inbox is unauthenticated and default-public
- **Severity:** Medium  
- **Evidence:** Default endpoint `https://formsubmit.co/ajax/hello@kelus.me` (`lib/questions.ts` L3–5, L21–27); no CAPTCHA/rate limit in app.  
- **Why it hurts:** Spam floods the only support channel that Exam Pass promises (“direct email if something breaks”).  
- **Fix:** Proxied inbox with Turnstile (or equivalent) and drop the hardcoded public FormSubmit default in production.

### Design-system / brand drift in shipping CSS
- **Severity:** Low  
- **Evidence:** `design.md` and `tokens.css` lock indigo ledger (`#533afd`); `globals.css` still carries green-era hero tokens (`--hero-green: #245c45` ~L206) and large unused eras. Agent rules still say “Kelus green.”  
- **Why it hurts:** Future UI work oscillates between green and indigo; marketing screens risk looking like two products.  
- **Fix:** Delete dead hero tokens in a distill pass; align agent rules to indigo ledger.

---

## 6. Growth / distribution / ops

### Paid conversion depends on manual Stripe success URL configuration
- **Severity:** High  
- **Evidence:** Unlock requires operators to set success URL to `?pass=1` (`app/privacy/page.tsx` L87–90; ExamWeekPlan copy L115); Payment Link opens `target="_blank"` (`FoundingCta.tsx` L18–22; `ExamWeekPlan.tsx` L101–105). Wrong or missing success URL = paid user returns locked.  
- **Why it hurts:** Support load and refunds scale with every successful checkout that never activates.  
- **Fix:** Automate success/cancel URLs in deployment docs/CI checks; prefer redirect that redeems a session id, not a bare flag.

### “Direct email through exam day” is an unscalable founder promise
- **Severity:** Medium  
- **Evidence:** Pricing bullet (`app/pricing/page.tsx` L59) with no CRM, no purchase metadata, no exam-date field on Stripe; support is `mailto:hello@kelus.me` everywhere.  
- **Why it hurts:** Cannot keep the promise once more than a handful pay; broken promises destroy word-of-mouth.  
- **Fix:** Collect exam date + email at checkout; queue a real support SLA only for verified buyers — or remove the bullet.

### Checkout-click analytics incomplete on the soft paywall
- **Severity:** Low  
- **Evidence:** `exam_pass_checkout_clicked` on FoundingCta / ExamWeekPlan only (`lib/analytics.ts` L20; FoundingCta L23; ExamWeekPlan L106); SoftUpgradePrompt primary CTA has no `onClick` track (`SoftUpgradePrompt.tsx` L66–68).  
- **Why it hurts:** You cannot tell which upsell moment drives revenue.  
- **Fix:** Fire the same checkout event with `source: soft_upgrade_${moment}`.

---

## Highest-leverage failures (if you only fix three)

1. **Replace `?pass=1` + localStorage with a verified entitlement** — monetization and trust are fake until this ships.  
2. **Stop lying with the 21-day horizon / free coverage headline** — honesty of the remaining-day plan is the whole Exam Pass pitch.  
3. **Shorten real-course first run (manual concepts when OCR dies)** — otherwise almost nobody reaches a moment where $9 is even considered.
