// Public Supabase settings. Both values are safe to publish: they're sent to every visitor's browser,
// and the data is protected by row level security plus the is_superadmin checks in the database.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tbjisbhgemgngsbudkab.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dHjXVoRdg5-tnSQ7fc_nPg_M6l8uGZW";
export const IMAGE_BUCKET = "posts"; // meme uploads, stored as posts/{user id}/...
