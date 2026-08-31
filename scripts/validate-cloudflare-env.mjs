const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_D1_DATABASE_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  throw new Error(`Missing required production deployment variables: ${missing.join(", ")}`);
}

const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID.trim();
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databaseId)) {
  throw new Error("CLOUDFLARE_D1_DATABASE_ID must be a valid UUID.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a Supabase project URL.");
}

console.log("Cloudflare production deployment variables are configured.");
