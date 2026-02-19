import type { NextApiRequest, NextApiResponse } from 'next';
import type { DbSection, DbQuestion } from '@/types/assessment';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseQuestionnaire } from '@/lib/questionnaire';

const DEFAULT_VERSION = 'v1.0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServiceRoleClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { data: versionRow } = await supabase
      .from('assessments')
      .select('id, version')
      .eq('version', DEFAULT_VERSION)
      .single();

    const version = versionRow?.version ?? DEFAULT_VERSION;
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

    res.status(200).json({ version, sections, questions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
