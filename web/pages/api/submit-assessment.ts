import type { NextApiRequest, NextApiResponse } from 'next';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { verifyAssessmentToken } from '@/lib/assessment-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  const token = body.token;
  if (typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }
  const payload = verifyAssessmentToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const { data, error, status } = await invokeEdgeFunction('score-assessment', {
    assessmentId: payload.assessmentId,
    clientToken: payload.clientToken,
  });
  if (error) {
    return res.status(status >= 400 ? status : 500).json({ error });
  }
  res.status(200).json(data ?? {});
}
