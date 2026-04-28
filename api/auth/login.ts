import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDb } from '../_lib/db';
import { signToken } from '../_lib/auth';
import { setCorsHeaders } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const sql = getDb();
    const rows = await sql`SELECT id, email, name, password_hash FROM users WHERE email = ${email.toLowerCase().trim()}`;
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'Email ou senha inválidos' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou senha inválidos' });

    const token = await signToken({ userId: user.id, email: user.email, name: user.name });
    return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err: any) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
