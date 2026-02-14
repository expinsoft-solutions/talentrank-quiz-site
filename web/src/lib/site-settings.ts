import { supabase } from '@/lib/supabase';

export interface VslConfig {
  vsl_enabled: boolean;
  vsl_type: 'internal' | 'external';
  vsl_url: string;
  vsl_embed_url: string;
}

const DEFAULT_VSL: VslConfig = {
  vsl_enabled: true,
  vsl_type: 'internal',
  vsl_url: '/vsl',
  vsl_embed_url: '',
};

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === true) return true;
  return false;
}

/**
 * Fetches public site settings from DB and returns VSL config.
 * Uses anon key; RLS allows SELECT on site_settings.
 */
export async function getVslConfig(): Promise<VslConfig> {
  const { data: rows, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['vsl_enabled', 'vsl_type', 'vsl_url', 'vsl_embed_url']);

  if (error) {
    console.warn('site_settings fetch failed', error);
    return DEFAULT_VSL;
  }

  const map = new Map<string, unknown>();
  for (const row of rows ?? []) {
    map.set(row.key, row.value);
  }

  return {
    vsl_enabled: parseBool(map.get('vsl_enabled')),
    vsl_type: String(map.get('vsl_type') ?? 'internal') === 'external' ? 'external' : 'internal',
    vsl_url: typeof map.get('vsl_url') === 'string' ? map.get('vsl_url') as string : DEFAULT_VSL.vsl_url,
    vsl_embed_url: typeof map.get('vsl_embed_url') === 'string' ? map.get('vsl_embed_url') as string : '',
  };
}

