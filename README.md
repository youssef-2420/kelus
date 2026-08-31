# Kelus

Kelus is a Next.js/Vinext shopping-intelligence application. Codex or any local editor is the development environment; GitHub `main` is the production source of truth; Cloudflare Workers, static assets, and D1 are the production runtime.

## Local development

```bash
npm install
npm run dev
```

Local secrets belong in `.env.local`. Required names are documented in `.env.example`. Never put server secrets in a `NEXT_PUBLIC_*` variable.

Verification:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:static
```

`npm run build` creates the Cloudflare Worker application in `dist/`. `npm run build:static` creates the GitHub Pages fallback in `out/`; that fallback cannot replace production because canonical product intelligence requires Worker SSR and D1.

## How Kelus deploys now

Every push or merged pull request to `main` runs `.github/workflows/deploy-cloudflare.yml`:

1. Install and verify the application.
2. Build the Vinext Cloudflare Worker.
3. Inject the production D1 binding into the generated deployment configuration.
4. Apply D1 migrations.
5. Deploy `kelus-production` while retaining dashboard-managed secrets.

No ChatGPT Sites/OpenAI Sites publish step is part of this workflow.

### GitHub production environment

Use the existing GitHub environment named `Production` under **Repository → Settings → Environments**.

Environment secrets:

| Name | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account containing the Kelus zone and Worker |
| `CLOUDFLARE_API_TOKEN` | Token with Account Workers Scripts:Edit and D1:Edit |
| `CLOUDFLARE_D1_DATABASE_ID` | ID of the `kelus-production` D1 database |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL used at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase browser key used at build time |

Environment variable:

| Name | Value |
| --- | --- |
| `ALERT_EMAIL_FROM` | `Kelus Alerts <alerts@updates.kelus.me>` |

### One-time Cloudflare Worker secrets

After the first Worker deployment, set these under **Cloudflare → Workers & Pages → kelus-production → Settings → Variables and Secrets**:

| Secret | Required for |
| --- | --- |
| `EBAY_CLIENT_ID` | eBay production OAuth |
| `EBAY_CLIENT_SECRET` | eBay production OAuth |
| `SUPABASE_SECRET_KEY` | Server-side alert monitoring |
| `ALERT_MONITOR_SECRET` | Operations endpoint and scheduled monitor authorization |
| `RESEND_API_KEY` | Transactional target-price email |

Also set `NEXT_PUBLIC_SUPABASE_URL` as a plain runtime variable if it is not already present. Deployment uses `--keep-vars`, so dashboard secrets survive future deployments.

## D1 setup

Create a D1 database named `kelus-production` in **Cloudflare → Storage & Databases → D1**. Copy its database ID into the GitHub production secret `CLOUDFLARE_D1_DATABASE_ID`. Deployment applies SQL files from `migrations/` automatically and binds the database as `DB`.

The scheduled Worker trigger runs every 15 minutes and reuses the existing deduplicated alert-monitor and product-snapshot refresh logic.

The former Sites-managed D1 database is not automatically transferable to a different Cloudflare account. If an export is available, import it before cutover. Otherwise deploy the new Worker on its `workers.dev` URL, configure eBay secrets, and allow the refresh scheduler to build validated snapshots before moving the domain. Supabase authentication and user alerts remain in the existing Supabase project and are not reset by this migration.

## Domain cutover

Cloudflare must be authoritative for `kelus.me` before adding Worker custom domains.

| Host | Before | After |
| --- | --- | --- |
| `kelus.me` | Existing proxied apex records serving ChatGPT Sites | Worker custom domain attached to `kelus-production` |
| `www.kelus.me` | CNAME to `custom-domains.chatgpt.site` | Worker custom domain attached to `kelus-production`; application returns 308 to apex |

Cutover checklist:

1. Deploy and verify the generated `*.workers.dev` URL.
   Confirm the Cloudflare account has Images enabled because the Worker retains the existing `IMAGES` binding.
2. In **Workers & Pages → kelus-production → Settings → Domains & Routes**, add custom domain `kelus.me`.
3. Add custom domain `www.kelus.me`. Cloudflare creates the required proxied DNS records.
4. Remove the old `www → custom-domains.chatgpt.site` CNAME and conflicting apex records when Cloudflare prompts.
5. Verify `/`, `/robots.txt`, `/sitemap.xml`, `/alerts/`, `/auth/callback/`, and a canonical `/product/.../` URL.
6. Confirm `www` redirects once to `https://kelus.me` and Supabase allows `https://kelus.me/auth/callback/`.
7. Disconnect `kelus.me` from ChatGPT Sites only after both custom domains are healthy.

Rollback: remove the Worker custom domains and restore the previous DNS records. Do not delete the D1 database during rollback.

## GitHub Pages fallback

`.github/workflows/deploy-pages.yml` remains enabled as staging/disaster-recovery. It is not the canonical production host and does not provide Worker APIs, D1 snapshots, scheduled monitoring, or dynamic canonical product intelligence.
