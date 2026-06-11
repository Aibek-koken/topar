import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS for writes. The key must only ever live
// in .env (gitignored) — never in EXPO_PUBLIC_* vars that get bundled.
export function createAdminClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
