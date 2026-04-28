import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, getTokenFromHeader } from '../_lib/auth';
import { setCorsHeaders } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = getTokenFromHeader(req.headers.authorization as string);
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido ou expirado' });

  return res.status(200).json({ user: { id: payload.userId, email: payload.email, name: payload.name } });
}
