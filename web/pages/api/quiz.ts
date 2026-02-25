import type { NextApiRequest, NextApiResponse } from 'next';
import type { DbSection, DbQuestion } from '@/types/assessment';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentActiveAssessment } from '@/lib/active-assessment';
import { parseQuestionnaire } from '@/lib/questionnaire';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createServiceRoleClient();
    const currentActiveAssessment = await getCurrentActiveAssessment(supabase);
    if (!currentActiveAssessment) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    const version = currentActiveAssessment.version;
    let sections: DbSection[] = [];
    let questions: DbQuestion[] = [];

    if (currentActiveAssessment.questionnaire) {
      const parsed = parseQuestionnaire(currentActiveAssessment.questionnaire);
      sections = parsed.sections;
      questions = parsed.questions.filter((q) => q.active !== false);
    }

    res.status(200).json({ version, sections, questions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
