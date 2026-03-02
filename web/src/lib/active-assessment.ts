import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface CurrentActiveAssessment {
  id: number;
  version: string;
  questionnaire: unknown;
}

function hasFreeContent(q: unknown): boolean {
  if (q && typeof q === 'object' && !Array.isArray(q)) {
    const obj = q as Record<string, unknown>;
    const free = obj.free;
    return Array.isArray(free) && free.some((s: unknown) => Array.isArray((s as Record<string, unknown>)?.questions));
  }
  return Array.isArray(q) && q.length > 0 && q.some((s: unknown) => Array.isArray((s as Record<string, unknown>)?.questions));
}

function hasPaidContent(q: unknown): boolean {
  if (q && typeof q === 'object' && !Array.isArray(q)) {
    const obj = q as Record<string, unknown>;
    const paid = obj.paid;
    return Array.isArray(paid) && paid.some((s: unknown) => Array.isArray((s as Record<string, unknown>)?.questions));
  }
  return false;
}

function hasQuestionnaireContent(q: unknown): boolean {
  return hasFreeContent(q) || hasPaidContent(q);
}

export async function getCurrentAssessment(
  supabase?: SupabaseClient,
  options?: { variant?: 'free' | 'paid' }
): Promise<CurrentActiveAssessment | null> {
  const client = supabase ?? createServiceRoleClient();
  const { data: rows } = await client
    .from('assessments')
    .select('id, version, questionnaire')
    .order('created_at', { ascending: false })
    .limit(10);

  const variant = options?.variant ?? 'free';
  const hasVariant = variant === 'free' ? hasFreeContent : hasPaidContent;
  const latestWithContent = Array.isArray(rows)
    ? rows.find((r) => hasVariant(r.questionnaire))
    : null;
  const chosen = latestWithContent ?? rows?.find((r) => hasQuestionnaireContent(r.questionnaire)) ?? rows?.[0];

  if (!chosen?.id) return null;
  return {
    id: chosen.id,
    version: chosen.version ?? '',
    questionnaire: chosen.questionnaire,
  };
}

export async function getCurrentActiveAssessment(
  supabase?: SupabaseClient,
  options?: { variant?: 'free' | 'paid' }
): Promise<CurrentActiveAssessment | null> {
  return getCurrentAssessment(supabase, options);
}

export async function getCurrentPaidAssessment(
  supabase?: SupabaseClient
): Promise<CurrentActiveAssessment | null> {
  return getCurrentAssessment(supabase, { variant: 'paid' });
}
