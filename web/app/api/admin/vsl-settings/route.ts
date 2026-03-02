import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401 };
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const keys = ['vsl_enabled', 'vsl_type', 'vsl_url', 'vsl_wistia_media_id', 'vsl_headline', 'vsl_subtitle', 'vsl_testimonial', 'vsl_require_completion'];
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('site_settings')
    .select('key, value')
    .in('key', keys);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<string, unknown>();
  for (const row of rows ?? []) {
    map.set(row.key as string, row.value);
  }

  const str = (k: string, def: string) => (typeof map.get(k) === 'string' ? (map.get(k) as string).replace(/^"|"$/g, '') : def);
  const vslEnabled = map.get('vsl_enabled') === true || map.get('vsl_enabled') === 'true';
  const vslType = str('vsl_type', 'internal') === 'external' ? 'external' : 'internal';
  const vslUrl = str('vsl_url', '/vsl') || '/vsl';
  const vslWistiaMediaId = str('vsl_wistia_media_id', 'mfxlojyy76') || 'mfxlojyy76';
  const vslHeadline = str('vsl_headline', 'Your Custom Report Is Being Generated...');
  const vslSubtitle = str('vsl_subtitle', 'Your AI Analysis takes 3-5 minutes to complete. While it processes, watch this explanation of what makes your assessment different from every personality test you\'ve taken.');
  const vslTestimonial = str('vsl_testimonial', '"Something literally everyone should know about themselves" — Sarah M.');
  const vslRequireCompletion = map.get('vsl_require_completion') !== false && map.get('vsl_require_completion') !== 'false';

  return NextResponse.json({ vslEnabled, vslType, vslUrl, vslWistiaMediaId, vslHeadline, vslSubtitle, vslTestimonial, vslRequireCompletion });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  let body: {
    vslEnabled?: boolean;
    vslType?: string;
    vslUrl?: string;
    vslWistiaMediaId?: string;
    vslHeadline?: string;
    vslSubtitle?: string;
    vslTestimonial?: string;
    vslRequireCompletion?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const vslEnabled = body.vslEnabled === true;
  const vslType = body.vslType === 'external' ? 'external' : 'internal';
  const vslUrl = typeof body.vslUrl === 'string' ? body.vslUrl.trim() || '/vsl' : '/vsl';
  const vslWistiaMediaId = typeof body.vslWistiaMediaId === 'string' ? body.vslWistiaMediaId.trim() || 'mfxlojyy76' : 'mfxlojyy76';
  const vslHeadline = typeof body.vslHeadline === 'string' ? body.vslHeadline.trim() || 'Your Custom Report Is Being Generated...' : 'Your Custom Report Is Being Generated...';
  const vslSubtitle = typeof body.vslSubtitle === 'string' ? body.vslSubtitle.trim() : '';
  const vslTestimonial = typeof body.vslTestimonial === 'string' ? body.vslTestimonial.trim() : '';
  const vslRequireCompletion = body.vslRequireCompletion !== false;

  const admin = createAdminClient();
  const { error } = await admin.from('site_settings').upsert(
    [
      { key: 'vsl_enabled', value: vslEnabled, updated_at: new Date().toISOString() },
      { key: 'vsl_type', value: vslType, updated_at: new Date().toISOString() },
      { key: 'vsl_url', value: vslUrl, updated_at: new Date().toISOString() },
      { key: 'vsl_wistia_media_id', value: vslWistiaMediaId, updated_at: new Date().toISOString() },
      { key: 'vsl_headline', value: vslHeadline, updated_at: new Date().toISOString() },
      { key: 'vsl_subtitle', value: vslSubtitle, updated_at: new Date().toISOString() },
      { key: 'vsl_testimonial', value: vslTestimonial, updated_at: new Date().toISOString() },
      { key: 'vsl_require_completion', value: vslRequireCompletion, updated_at: new Date().toISOString() },
    ],
    { onConflict: 'key' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
