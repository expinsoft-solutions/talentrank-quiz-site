import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { verifyAssessmentToken } from '@/lib/assessment-token';

interface ResponseItem {
  questionId: string;
  answerNumeric?: number | null;
  answerRaw?: string | null;
}

function isResponseItem(r: unknown): r is ResponseItem {
  return (
    r != null &&
    typeof (r as ResponseItem).questionId === 'string'
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  const token = body.token;
  const responsesInput = body.responses;

  if (typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }
  const payload = verifyAssessmentToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const responses: ResponseItem[] = Array.isArray(responsesInput)
    ? responsesInput.filter(isResponseItem)
    : [];

  const supabase = createServiceRoleClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { data: attempt, error: fetchError } = await supabase
    .from('assessment_attempts')
    .select('id, is_paid')
    .eq('id', payload.assessmentId)
    .eq('client_token', payload.clientToken)
    .single();

  if (fetchError || !attempt) {
    return res.status(404).json({ error: 'Assessment not found' });
  }
  if (!attempt.is_paid) {
    return res.status(403).json({ error: 'Payment required to submit Blueprint questions' });
  }

  const paidResponses: Record<string, { answerNumeric?: number; answerRaw?: string }> = {};
  for (const r of responses) {
    const entry: { answerNumeric?: number; answerRaw?: string } = {};
    if (r.answerNumeric != null) entry.answerNumeric = Number(r.answerNumeric);
    if (typeof r.answerRaw === 'string') entry.answerRaw = r.answerRaw;
    if (Object.keys(entry).length > 0) {
      paidResponses[r.questionId] = entry;
    }
  }

  const { error: updateError } = await supabase
    .from('assessment_attempts')
    .update({ paid_responses: paidResponses })
    .eq('id', payload.assessmentId)
    .eq('client_token', payload.clientToken);

  if (updateError) {
    return res.status(500).json({ error: 'Failed to save responses' });
  }

  const { data, error, status } = await invokeEdgeFunction('generate-report', {
    assessmentId: payload.assessmentId,
    clientToken: payload.clientToken,
  });
  if (error) {
    return res.status(status >= 400 ? status : 500).json({ error });
  }

  const result = (data ?? {}) as Record<string, unknown>;
  return res.status(200).json({
    ...result,
    assessmentId: payload.assessmentId,
    clientToken: payload.clientToken,
  });
}
