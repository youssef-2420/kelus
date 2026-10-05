# Kelus AI proxy

The only place the Anthropic API key lives. The app sends it one topic's page text; it returns study questions.
It never stores or logs page text, and the app throws away any question whose quote is not on the student's page.

**Nothing here runs until you deploy it and point the app at it.** With no endpoint configured, the app behaves exactly as before.

## Set it up

1. **Get a key.** Create one at https://console.anthropic.com and set a monthly spending limit there (for example $5). That limit is the real ceiling; the limits in `index.mjs` are only a brake.
2. **Deploy as a Cloudflare Worker** (kelus.me already sits on Cloudflare):
   ```bash
   cd ai-proxy
   npm install
   npx wrangler deploy index.mjs --name kelus-ai --compatibility-date 2026-10-01
   npx wrangler secret put ANTHROPIC_API_KEY      # paste the key when asked; it is not stored in the repo
   ```
   Optional settings (`wrangler.toml` vars or the dashboard): `ALLOWED_ORIGINS` (default `https://kelus.me`), `AI_MODEL` (default `claude-opus-5-5`), `AI_EFFORT` (default `low`), `PER_IP_PER_HOUR` (30), `DAILY_CAP` (500), `AI_FALLBACK=off`.
3. **Point the app at it.** Add the Worker's URL as the build variable `NEXT_PUBLIC_AI_ENDPOINT` (same place as the other `NEXT_PUBLIC_*` secrets), then rebuild.
4. **Check the wording.** The opt-in card in Materials says what is sent and what is not. Make sure it matches the privacy page before turning it on for students.

## Cost
Roughly 1,500 tokens in and 1,500 out per topic. At the default model (Opus 5.5, $4 / $20 per million tokens) that is about 3 to 5 US cents a topic, so a 6-topic course is under 30 cents. `AI_MODEL=claude-haiku-4-5` costs about a fifth of that. Questions are cached on the device, so reopening a topic costs nothing.

## Test
`npm test` runs the proxy against a fake model. It does not call the real API.
