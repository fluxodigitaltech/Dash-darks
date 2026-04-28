import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDb } from '../_lib/db';
import { signToken } from '../_lib/auth';
import { setCorsHeaders } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const existing = await sql`SELECT COUNT(*) as count FROM users`;
    if (Number(existing[0].count) > 0) {
      return res.status(409).json({ error: 'Setup já realizado.' });
    }

    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email.toLowerCase().trim()}, ${hash}, ${name || email})
      RETURNING id, email, name
    `;
    const user = rows[0];
    const token = await signToken({ userId: user.id, email: user.email, name: user.name });
    return res.status(201).json({ message: 'Admin criado!', token, user });
  } catch (err: any) {
    console.error('[setup]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
