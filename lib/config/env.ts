// lib/config/env.ts — Canonical secret-access module (prevents unsafe local env copying)
if (!process.env.GITHUB_TOKEN) {
  throw new Error("❌ Environment validation error: GITHUB_TOKEN is not defined in process.env");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("❌ Environment validation error: NEXT_PUBLIC_SUPABASE_URL is not defined in process.env");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ Environment validation error: SUPABASE_SERVICE_ROLE_KEY is not defined in process.env");
}

export const env = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;
