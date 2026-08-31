import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const configPath = resolve("dist/server/wrangler.json");
const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || "kelus-production";

const config = JSON.parse(await readFile(configPath, "utf8"));
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() || config.d1_databases?.[0]?.database_id;

if (!databaseId || !/^[0-9a-f-]{32,36}$/i.test(databaseId)) {
  throw new Error("The generated Worker config must contain the production D1 database ID.");
}
config.name = "kelus-production";
config.workers_dev = true;
config.preview_urls = true;
config.observability = { enabled: true };
config.triggers = { crons: ["*/15 * * * *"] };
config.images = { binding: "IMAGES" };
config.d1_databases = [{ binding: "DB", database_name: databaseName, database_id: databaseId, migrations_dir: "../../migrations" }];
config.vars = {
  EBAY_MARKETPLACE_ID: process.env.EBAY_MARKETPLACE_ID || "EBAY_US",
  EBAY_CACHE_TTL_SECONDS: process.env.EBAY_CACHE_TTL_SECONDS || "60",
  EBAY_REQUEST_TIMEOUT_MS: process.env.EBAY_REQUEST_TIMEOUT_MS || "8000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  ALERT_EMAIL_FROM: process.env.ALERT_EMAIL_FROM || "Kelus Alerts <alerts@updates.kelus.me>",
};

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${config.name} for D1 binding DB (${databaseName}).`);
