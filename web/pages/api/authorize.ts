import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createAssessmentToken } from '@/lib/assessment-token';
import { getCurrentActiveAssessment } from '@/lib/active-assessment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() || undefined : undefined;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const supabase = createServiceRoleClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const currentActiveAssessment = await getCurrentActiveAssessment(supabase);
    if (!currentActiveAssessment) {
      return res.status(404).json({ error: 'Active questionnaire not found' });
    }
    const version = currentActiveAssessment.version;
    const questionnaireVersionId = currentActiveAssessment.id;

    const normalizedEmail = email.toLowerCase();
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    let userId: string;
    if (existingUser?.id) {
      userId = existingUser.id;
    } else {
      const { data: inserted, error: userError } = await supabase
        .from('users')
        .insert({ email: normalizedEmail, first_name: firstName ?? null })
        .select('id')
        .single();
      if (userError || !inserted?.id) {
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userId = inserted.id;
    }

    const { error: updateUserError } = await supabase
      .from('users')
      .update({ email: normalizedEmail, first_name: firstName ?? null })
      .eq('id', userId);
    if (updateUserError) {
      return res.status(500).json({ error: 'Failed to save user details' });
    }

    const clientToken = crypto.randomUUID();
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .insert({
        user_id: userId,
        version,
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

    const quizKey = version;
    const { data: countRow } = await supabase
      .from('user_quiz_attempt_counts')
      .select('attempt_count')
      .eq('user_id', userId)
      .eq('quiz_key', quizKey)
      .single();
    const nextCount = (countRow?.attempt_count ?? 0) + 1;
    await supabase
      .from('user_quiz_attempt_counts')
      .upsert(
        { user_id: userId, quiz_key: quizKey, attempt_count: nextCount, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,quiz_key' }
      );

    const token = createAssessmentToken({
      assessmentId: assessmentData.id,
      clientToken: assessmentData.client_token,
      userId,
    });
    return res.status(200).json({ userId, token });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
