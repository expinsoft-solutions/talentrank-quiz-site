import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface CurrentActiveAssessment {
  id: number;
  version: string;
  questionnaire: unknown;
}

const DEFAULT_VERSION = 'v1.0';

export async function getCurrentActiveAssessment(
  supabase?: SupabaseClient
): Promise<CurrentActiveAssessment | null> {
  const client = supabase ?? createServiceRoleClient();
  const { data: settingRow } = await client
    .from('site_settings')
    .select('value')
    .eq('key', 'active_assessment_version')
    .single();
  const version = typeof settingRow?.value === 'string' ? settingRow.value : DEFAULT_VERSION;
  const activeVersion = version || DEFAULT_VERSION;
  const { data } = await client
    .from('assessments')
    .select('id, version, questionnaire')
    .eq('version', activeVersion)
    .single();
  if (!data?.id) return null;
  return {
    id: data.id,
    version: data.version ?? activeVersion,
    questionnaire: data.questionnaire,
  };
}
