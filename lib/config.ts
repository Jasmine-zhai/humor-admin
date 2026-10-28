// The admin area manages the shared course database (the Humor Project copy in "humor-semester-project").
// Both values are public by design: they're sent to every visitor's browser, and access is enforced by
// Supabase row level security plus the is_superadmin check in lib/admin.ts.
export const SUPABASE_URL = "https://caquicvphywvhsrguyxs.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_FdW1meGdbCmaTvqNQlsGDA_05B4M4rc";
export const IMAGE_BUCKET = "images";
