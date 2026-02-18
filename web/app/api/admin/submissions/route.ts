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

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const status = searchParams.get('status');

  const supabase = createAdminClient();
  let query = supabase
    .from('assessment_attempts')
    .select('id, status, started_at, completed_at, mbti, axis_strengths, cognitive_percentile, report_text, user_id', {
      count: 'exact',
    })
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === 'completed' || status === 'started') {
    query = query.eq('status', status);
  }

  const { data: attempts, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((attempts ?? []).map((a: { user_id: string }) => a.user_id).filter(Boolean))];
  let userMap: Record<string, { email?: string; firstName?: string; device?: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, email, first_name, device').in('id', userIds);
    userMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; email?: string; first_name?: string; device?: string }) => [
        u.id,
        { email: u.email, firstName: u.first_name, device: u.device },
      ])
    );
  }

  const items = (attempts ?? []).map((row: Record<string, unknown>) => {
    const u = userMap[(row.user_id as string) ?? ''] ?? {};
    return {
      id: row.id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      mbti: row.mbti,
      axisStrengths: row.axis_strengths,
      cognitivePercentile: row.cognitive_percentile,
      reportText: row.report_text,
      user: u,
    };
  });

  return NextResponse.json({ items, total: count ?? 0 });
}
