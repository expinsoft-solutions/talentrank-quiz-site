import type { NextApiRequest, NextApiResponse } from 'next';
import type { DbSection, DbQuestion } from '@/types/assessment';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseQuestionnaire } from '@/lib/questionnaire';

const QUESTIONNAIRE_VERSION = 'v1.0';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createAdminClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    let body: { userId?: string } = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    } catch {
      //
    }
    const existingUserId = typeof body.userId === 'string' ? body.userId.trim() : null;

    let userData: { id: string } | null = null;
    if (existingUserId) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', existingUserId)
        .single();
      if (existing?.id) {
        userData = existing;
      }
    }
    if (!userData) {
      const { data: inserted, error: userError } = await supabase
        .from('users')
        .insert({})
        .select('id')
        .single();
      if (userError || !inserted?.id) {
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userData = inserted;
    }

    if (userError || !userData?.id) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const clientToken = crypto.randomUUID();
    const { data: versionRow } = await supabase
      .from('assessments')
      .select('id')
      .eq('version', QUESTIONNAIRE_VERSION)
      .single();

    const questionnaireVersionId = versionRow?.id ?? null;

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .insert({
        user_id: userData.id,
        version: QUESTIONNAIRE_VERSION,
        status: 'started',
        started_at: new Date().toISOString(),
        client_token: clientToken,
        questionnaire_version_id: questionnaireVersionId,
      })
      .select('id, client_token')
      .single();

    if (assessmentError || !assessmentData?.id) {
      return res.status(500).json({ error: 'Failed to create assessment' });
    }

    let sections: DbSection[] = [];
    let questions: DbQuestion[] = [];

    if (versionRow?.id) {
      const { data: qv } = await supabase
        .from('assessments')
        .select('questionnaire')
        .eq('id', versionRow.id)
        .single();
      if (qv?.questionnaire) {
        const parsed = parseQuestionnaire(qv.questionnaire);
        sections = parsed.sections;
        questions = parsed.questions.filter((q) => q.active !== false);
      }
    }

    res.status(200).json({
      assessmentId: assessmentData.id,
      clientToken: assessmentData.client_token,
      sections,
      questions,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
