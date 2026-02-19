import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({
    error: 'Gone',
    message: 'Use POST /api/submit-assessment with token and responses.',
  });
}
