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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const { id } = await params;

  const supabase = createAdminClient();
  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('id', id)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, first_name, device')
    .eq('id', attempt.user_id)
    .single();

  const { data: responses } = await supabase
    .from('responses')
    .select('question_id, answer_numeric, answer_raw, time_taken_seconds')
    .eq('assessment_id', id)
    .order('question_id');

  return NextResponse.json({
    attempt,
    user: user ?? {},
    responses: responses ?? [],
  });
}
