import type { NextApiRequest, NextApiResponse } from 'next';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'object' ? req.body : {};
  const { data, error, status } = await invokeEdgeFunction('generate-report', body);
  if (error) {
    return res.status(status >= 400 ? status : 500).json({ error });
  }
  res.status(200).json(data ?? {});
}
