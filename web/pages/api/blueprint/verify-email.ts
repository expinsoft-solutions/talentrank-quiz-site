import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createAssessmentToken } from '@/lib/assessment-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  const assessmentId = typeof body.assessmentId === 'string' ? body.assessmentId.trim() : '';
  const clientToken = typeof body.clientToken === 'string' ? body.clientToken.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!assessmentId || !clientToken || !email) {
    return res.status(400).json({ error: 'assessmentId, clientToken, and email are required' });
  }

  const supabase = createServiceRoleClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .select('id, client_token, user_id')
    .eq('id', assessmentId)
    .single();

  if (attemptError || !attempt) {
    return res.status(404).json({ error: 'Assessment not found' });
  }
  if (attempt.client_token !== clientToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', attempt.user_id)
    .single();

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.email?.toLowerCase() !== email.toLowerCase()) {
    return res.status(400).json({ error: 'Email does not match the one used when taking the quiz' });
  }

  const token = createAssessmentToken({
    assessmentId,
    clientToken,
    userId: user.id,
  });
  return res.status(200).json({ token });
}
