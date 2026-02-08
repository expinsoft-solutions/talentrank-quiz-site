import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean);
    throw new Error(`Missing in .env.local: ${missing.join(', ')}. Restart dev server after editing .env.local.`);
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}
