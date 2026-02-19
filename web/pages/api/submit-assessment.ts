import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { verifyAssessmentToken } from '@/lib/assessment-token';

interface ResponseItem {
  questionId: string;
  answerNumeric?: number | null;
  answerRaw?: string | null;
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
    ? responsesInput.filter(
        (r: unknown): r is ResponseItem =>
          r != null &&
          typeof (r as ResponseItem).questionId === 'string'
      )
    : [];

  const supabase = createServiceRoleClient();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  for (const r of responses) {
    const answerNumeric = r.answerNumeric != null ? Number(r.answerNumeric) : null;
    const answerRaw = typeof r.answerRaw === 'string' ? r.answerRaw : null;
    const { error } = await supabase.from('responses').upsert(
      {
        assessment_id: payload.assessmentId,
        client_token: payload.clientToken,
        question_id: r.questionId,
        answer_raw: answerRaw,
        answer_numeric: answerNumeric,
        time_taken_seconds: null,
      },
      { onConflict: 'assessment_id,question_id' }
    );
    if (error) {
      return res.status(500).json({ error: 'Failed to save responses' });
    }
  }

  const { data, error, status } = await invokeEdgeFunction('score-assessment', {
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
