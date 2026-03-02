import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentActiveAssessment } from '@/lib/active-assessment';
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

  const currentActiveAssessment = await getCurrentActiveAssessment(auth.admin);
  if (!currentActiveAssessment) {
    return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
  }

  return NextResponse.json({
    questionnaire: currentActiveAssessment.questionnaire,
    version: currentActiveAssessment.version,
  });
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

  if (!body.questionnaire) {
    return NextResponse.json({ error: 'questionnaire is required' }, { status: 400 });
  }
  const q = body.questionnaire;
  const valid =
    (typeof q === 'object' &&
      !Array.isArray(q) &&
      Array.isArray((q as Record<string, unknown>).free) &&
      Array.isArray((q as Record<string, unknown>).paid)) ||
    Array.isArray(q);
  if (!valid) {
    return NextResponse.json(
      { error: 'questionnaire must be { free: [...], paid: [...] } or legacy array of sections' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const currentActiveAssessment = await getCurrentActiveAssessment(admin);
  if (!currentActiveAssessment) {
    return NextResponse.json({ error: 'Active assessment not found' }, { status: 404 });
  }

  const payload = {
    questionnaire: body.questionnaire,
    version: currentActiveAssessment.version,
    language_key: 'en',
  };

  const { data, error } = await admin
    .from('assessments')
    .update(payload)
    .eq('id', currentActiveAssessment.id)
    .select('id, version')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id, version: data?.version });
}
