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

  const isPaid = req.query.type === 'paid';

  try {
    const supabase = createServiceRoleClient();
    const assessment = await getCurrentActiveAssessment(supabase, { variant: isPaid ? 'paid' : 'free' });
    if (!assessment) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(isPaid ? 200 : 404).json(
        isPaid
          ? { version: 'paid', sections: [], questions: [] }
          : { error: 'Questionnaire not found' }
      );
    }

    const variant = isPaid ? 'paid' : 'free';
    const parsed = parseQuestionnaire(assessment.questionnaire ?? {}, variant);
    const sections = parsed.sections.filter((s) => s.enabled !== false);
    const questions = parsed.questions.filter((q) => q.active !== false);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).json({ version: assessment.version, sections, questions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
