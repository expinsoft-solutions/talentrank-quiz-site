import type { NextApiRequest, NextApiResponse } from 'next';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { createAssessmentToken } from '@/lib/assessment-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  const { data, error, status } = await invokeEdgeFunction('update-assessment-user', body);
  if (error) {
    return res.status(status >= 400 ? status : 500).json({ error });
  }
  const assessmentId = body.assessmentId;
  const clientToken = body.clientToken;
  const d = data as Record<string, unknown> | undefined;
  const userId = typeof d?.userId === 'string' ? d.userId : null;
  if (userId && typeof assessmentId === 'string' && typeof clientToken === 'string') {
    const token = createAssessmentToken({ assessmentId, clientToken, userId });
    return res.status(200).json({ userId, token });
  }
  res.status(200).json(data ?? {});
}
