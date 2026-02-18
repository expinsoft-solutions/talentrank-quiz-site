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

  return { ok: true as const, admin };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, questionnaire, version')
    .eq('version', 'v1.0')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
  }

  return NextResponse.json({ questionnaire: data.questionnaire, version: data.version });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  let body: { questionnaire?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.questionnaire || !Array.isArray(body.questionnaire)) {
    return NextResponse.json({ error: 'questionnaire must be an array of sections' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('assessments')
    .upsert(
      { questionnaire: body.questionnaire, version: 'v1.0', language_key: 'en' },
      { onConflict: 'version' }
    )
    .select('id, version')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id, version: data?.version });
}
