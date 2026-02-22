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

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('site_settings')
    .select('key, value')
    .in('key', ['vsl_enabled', 'vsl_type', 'vsl_url', 'vsl_embed_url']);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<string, unknown>();
  for (const row of rows ?? []) {
    map.set(row.key as string, row.value);
  }

  const vslEnabled = map.get('vsl_enabled') === true || map.get('vsl_enabled') === 'true';
  const vslType = String(map.get('vsl_type') ?? 'internal').replace(/^"|"$/g, '') === 'external' ? 'external' : 'internal';
  const vslUrl = typeof map.get('vsl_url') === 'string' ? (map.get('vsl_url') as string).replace(/^"|"$/g, '') : '/vsl';
  const vslEmbedUrl = typeof map.get('vsl_embed_url') === 'string' ? (map.get('vsl_embed_url') as string).replace(/^"|"$/g, '') : '';

  return NextResponse.json({ vslEnabled, vslType, vslUrl, vslEmbedUrl });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  let body: { vslEnabled?: boolean; vslType?: string; vslUrl?: string; vslEmbedUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const vslEnabled = body.vslEnabled === true;
  const vslType = body.vslType === 'external' ? 'external' : 'internal';
  const vslUrl = typeof body.vslUrl === 'string' ? body.vslUrl.trim() || '/vsl' : '/vsl';
  const vslEmbedUrl = typeof body.vslEmbedUrl === 'string' ? body.vslEmbedUrl.trim() : '';

  const admin = createAdminClient();
  const { error } = await admin.from('site_settings').upsert(
    [
      { key: 'vsl_enabled', value: vslEnabled, updated_at: new Date().toISOString() },
      { key: 'vsl_type', value: vslType, updated_at: new Date().toISOString() },
      { key: 'vsl_url', value: vslUrl, updated_at: new Date().toISOString() },
      { key: 'vsl_embed_url', value: vslEmbedUrl, updated_at: new Date().toISOString() },
    ],
    { onConflict: 'key' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
