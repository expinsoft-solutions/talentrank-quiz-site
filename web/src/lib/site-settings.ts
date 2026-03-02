import { supabase } from '@/lib/supabase';

export interface VslConfig {
  vsl_enabled: boolean;
  vsl_type: 'internal' | 'external';
  vsl_url: string;
  vsl_wistia_media_id: string;
  vsl_headline: string;
  vsl_subtitle: string;
  vsl_testimonial: string;
  vsl_require_completion: boolean;
}

const DEFAULT_HEADLINE = 'Your Custom Report Is Being Generated...';
const DEFAULT_SUBTITLE = 'Your AI Analysis takes 3-5 minutes to complete. While it processes, watch this explanation of what makes your assessment different from every personality test you\'ve taken.';
const DEFAULT_TESTIMONIAL = '"Something literally everyone should know about themselves" — Sarah M.';

const DEFAULT_WISTIA_MEDIA_ID = 'mfxlojyy76';

const DEFAULT_VSL: VslConfig = {
  vsl_enabled: true,
  vsl_type: 'internal',
  vsl_url: '/vsl',
  vsl_wistia_media_id: DEFAULT_WISTIA_MEDIA_ID,
  vsl_headline: DEFAULT_HEADLINE,
  vsl_subtitle: DEFAULT_SUBTITLE,
  vsl_testimonial: DEFAULT_TESTIMONIAL,
  vsl_require_completion: true,
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
    .in('key', ['vsl_enabled', 'vsl_type', 'vsl_url', 'vsl_wistia_media_id', 'vsl_headline', 'vsl_subtitle', 'vsl_testimonial', 'vsl_require_completion']);

  if (error) {
    console.warn('site_settings fetch failed', error);
    return DEFAULT_VSL;
  }

  const map = new Map<string, unknown>();
  for (const row of rows ?? []) {
    map.set(row.key, row.value);
  }

  const str = (k: string, def: string) => (typeof map.get(k) === 'string' ? map.get(k) as string : def);
  return {
    vsl_enabled: parseBool(map.get('vsl_enabled')),
    vsl_type: String(map.get('vsl_type') ?? 'internal') === 'external' ? 'external' : 'internal',
    vsl_url: str('vsl_url', DEFAULT_VSL.vsl_url) || '/vsl',
    vsl_wistia_media_id: str('vsl_wistia_media_id', DEFAULT_WISTIA_MEDIA_ID) || DEFAULT_WISTIA_MEDIA_ID,
    vsl_headline: str('vsl_headline', DEFAULT_HEADLINE) || DEFAULT_HEADLINE,
    vsl_subtitle: str('vsl_subtitle', DEFAULT_SUBTITLE),
    vsl_testimonial: str('vsl_testimonial', DEFAULT_TESTIMONIAL),
    vsl_require_completion: map.get('vsl_require_completion') !== false && map.get('vsl_require_completion') !== 'false',
  };
}

