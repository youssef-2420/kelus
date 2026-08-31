const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  throw new Error(`Missing required production deployment variables: ${missing.join(", ")}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a Supabase project URL.");
}

console.log("Cloudflare production deployment variables are configured.");
