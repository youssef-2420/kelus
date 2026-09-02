# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (Vinext), static export to GitHub Pages, TypeScript, CSS in `app/globals.css`.

## Users

Shoppers comparing eBay electronics who want one validated offer—not the cheapest listing, but the one that passes product match, known shipping, seller evidence, returns, and price-anomaly checks.

## Product Purpose

Kelus helps users search an exact product configuration, compare matching eBay offers with known totals, see Kelus's recommended pick with evidence, track a target price, and buy with confidence.

Success means: search → understand the pick → act (view offer or set alert) without hesitation.

## Positioning

Kelus recommends one offer after validation checks—not a marketplace aggregator, not a price tracker alone. Known totals (listing + shipping) and seller evidence are surfaced before click-through.

## Operating Context

- Primary flow: Home/Search → Product comparison → View offer or Track price → Alerts
- Guest users can search and set device-local alerts; signed-in users get email on target reached and background checks
- Live eBay data with persisted snapshots for fast first paint; background refresh updates offers
- Coverage is curated (phones, computers, tablets, audio, wearables, consoles)—not all of eBay

## Capabilities and Constraints

- Search by product with variant (storage, color, etc.) and condition
- Comparison shows Our Pick vs cheapest with trade-off explanation
- Price alerts with target, pause, refresh, reached/dropped status
- Google sign-in for cross-device alerts and email notifications
- Do not invent user counts, savings claims, testimonials, or manufacturer warranty promises
- SEO and structured data are maintained separately—UX work must not add SEO slop

## Brand Commitments

- Name: Kelus (kelus.me)
- Voice: Direct, evidence-based, calm confidence—not hype
- Visual: Forest green (`#0d4640` / `#17675f`), paper background (`#fdfcf8`), Fraunces/Playfair headings, DM Sans/Inter body
- Tagline territory: "Find the offer worth buying" / "Shop smarter. Know before you buy."

## Evidence on Hand

- Real bundled snapshots and live eBay provider for supported products
- Methodology and how-it-works pages explain checks
- Coverage catalog with live/snapshot status per product
- No fabricated social proof or aggregate savings statistics

## Product Principles

1. **Operate mode** — Users are completing a task; clarity beats decoration.
2. **Known totals** — Always show listing + shipping when available; never hide shipping uncertainty.
3. **One pick** — One primary recommendation per comparison; cheaper alternatives explained as trade-offs.
4. **Exact configuration** — Variant, condition, and network (unlocked) matter; never blur product identity.
5. **Honest freshness** — Distinguish live, saved snapshot, stale, and unavailable states.

## Accessibility & Inclusion

- Keyboard navigation for search combobox, alerts accordion, offer rows
- Skip link to main content; 44px minimum touch targets on mobile CTAs
- Focus rings on interactive controls; reduced-motion respected
