import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { verifyToken, getTokenFromHeader } from '../_lib/auth';
import { setCorsHeaders } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getTokenFromHeader(req.headers.authorization as string);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Não autenticado' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM monthly_member_stats ORDER BY month_start_date ASC`;
    return res.status(200).json(rows);
  } catch (err: any) {
    console.error('[monthly-stats GET]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
