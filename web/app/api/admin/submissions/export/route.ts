import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { exportSubmissionsToAirtableBatch } from '@/lib/airtable';

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

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  let body: { assessmentId?: string; assessmentIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids: string[] = [];
  if (typeof body.assessmentId === 'string') {
    ids.push(body.assessmentId);
  }
  if (Array.isArray(body.assessmentIds)) {
    ids.push(...body.assessmentIds.filter((id): id is string => typeof id === 'string'));
  }
  const uniqueIds = [...new Set(ids)];
  const MAX_EXPORT = 200;
  const toExport = uniqueIds.length > MAX_EXPORT ? uniqueIds.slice(0, MAX_EXPORT) : uniqueIds;

  if (toExport.length === 0) {
    return NextResponse.json({ error: 'assessmentId or assessmentIds required' }, { status: 400 });
  }

  const { results: batchResults } = await exportSubmissionsToAirtableBatch(toExport);
  const results = toExport.map((assessmentId, i) => ({
    assessmentId,
    ok: batchResults[i]?.ok ?? false,
    ...(batchResults[i]?.airtableRecordId && { airtableRecordId: batchResults[i].airtableRecordId }),
    ...(batchResults[i]?.error && { error: batchResults[i].error }),
  }));

  return NextResponse.json({
    results,
    ...(uniqueIds.length > MAX_EXPORT && { truncated: true, exported: toExport.length, requested: uniqueIds.length }),
  });
}
