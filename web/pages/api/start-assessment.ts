import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const response = await fetch(`${url}/functions/v1/start-assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json(data?.error ?? { error: 'Failed to start assessment' });
  }
  res.status(200).json(data);
}
