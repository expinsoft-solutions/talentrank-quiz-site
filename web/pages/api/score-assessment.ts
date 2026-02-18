import type { NextApiRequest, NextApiResponse } from 'next';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { verifyAssessmentToken } from '@/lib/assessment-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  let invokeBody = body;
  if (typeof body.token === 'string') {
    const payload = verifyAssessmentToken(body.token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    invokeBody = { assessmentId: payload.assessmentId, clientToken: payload.clientToken };
  }
  const { data, error, status } = await invokeEdgeFunction('score-assessment', invokeBody);
  if (error) {
    return res.status(status >= 400 ? status : 500).json({ error });
  }
  res.status(200).json(data ?? {});
}
