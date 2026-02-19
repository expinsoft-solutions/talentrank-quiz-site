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
    .in('key', ['report_system_prompt', 'report_model']);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<string, unknown>();
  for (const row of rows ?? []) {
    map.set(row.key as string, row.value);
  }

  const reportSystemPrompt =
    typeof map.get('report_system_prompt') === 'string' ? (map.get('report_system_prompt') as string) : '';
  const defaultModel = 'claude-3-haiku-20240307';
  const rawModel = map.get('report_model');
  const reportModel =
    typeof rawModel === 'string' && rawModel.trim() ? (rawModel as string).trim() : defaultModel;

  return NextResponse.json({ reportSystemPrompt, reportModel });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  let body: { reportSystemPrompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const reportSystemPrompt = typeof body.reportSystemPrompt === 'string' ? body.reportSystemPrompt : '';
  const reportModel =
    typeof body.reportModel === 'string'
      ? body.reportModel
      : '';

  const admin = createAdminClient();
  const { error } = await admin.from('site_settings').upsert(
    [
      { key: 'report_system_prompt', value: reportSystemPrompt, updated_at: new Date().toISOString() },
      { key: 'report_model', value: reportModel, updated_at: new Date().toISOString() },
    ],
    { onConflict: 'key' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
