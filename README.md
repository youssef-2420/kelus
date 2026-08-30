# Kelus

Kelus helps shoppers compare trusted offers, understand the trade-offs, and buy with confidence.

## Main pages

- **Home:** `app/page.tsx`
- **How it works:** `app/how-it-works/page.tsx`
- **Results:** `app/results/page.tsx`
- **Product:** `app/product/iphone-17/page.tsx`
- **Compare offers:** `app/compare/iphone-17/page.tsx`
- **Price alerts:** `app/saved/page.tsx`

## Project structure

- `app/` — website pages
- `components/` — reusable interface components
- `app/globals.css` — visual styling
- `lib/demo-data.ts` — example product and offer data
- `public/` — images and icons

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Prototype status

Kelus currently uses clearly labeled demonstration offers. Sign-in, retailer links,
analytics, and price alerts are non-production placeholders; alerts are stored only
in the current browser. Do not enter real credentials.

The production site is a static Next.js export deployed by
`.github/workflows/deploy-pages.yml`. Production accounts, alerts, and retailer
feeds will require a separately secured API, database, and background job service;
those integrations are intentionally not simulated in this repository.
