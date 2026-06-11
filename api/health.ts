import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    runtime: 'vercel-node',
    timestamp: new Date().toISOString(),
  });
}
