import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Legacy endpoint intentionally disabled.
 * Use App Router endpoint: /api/webhooks/saipos
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  return res.status(410).json({
    error: 'Endpoint legado desativado. Use /api/webhooks/saipos.',
  });
}
