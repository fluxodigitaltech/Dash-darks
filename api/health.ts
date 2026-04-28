import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  return res.status(200).json({
    status: 'ok',
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      EVO_DNS: process.env.EVO_DNS || '(usando padrão: darksgym)',
      EVO_SECRET_KEY: !!process.env.EVO_SECRET_KEY,
      EVOLUTION_API_URL: !!process.env.EVOLUTION_API_URL,
    },
    timestamp: new Date().toISOString(),
  });
}
