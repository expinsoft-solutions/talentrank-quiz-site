import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface CurrentActiveAssessment {
  id: number;
  version: string;
  questionnaire: unknown;
}


function hasQuestionnaireContent(q: unknown): boolean {
  if (!Array.isArray(q) || q.length === 0) return false;
  return q.some((s: unknown) => Array.isArray((s as Record<string, unknown>)?.questions));
}

export async function getCurrentActiveAssessment(
  supabase?: SupabaseClient
): Promise<CurrentActiveAssessment | null> {
  const client = supabase ?? createServiceRoleClient();
  const { data: rows } = await client
    .from('assessments')
    .select('id, version, questionnaire')
    .order('created_at', { ascending: false })
    .limit(10);

  const latestWithContent = Array.isArray(rows)
    ? rows.find((r) => hasQuestionnaireContent(r.questionnaire))
    : null;
  const chosen = latestWithContent ?? rows?.[0];

  if (!chosen?.id) return null;
  return {
    id: chosen.id,
    version: chosen.version ?? '',
    questionnaire: chosen.questionnaire,
  };
}
