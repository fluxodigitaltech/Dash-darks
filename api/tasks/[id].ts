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

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

  const sql = getDb();

  if (req.method === 'PATCH') {
    try {
      const { client, project_campaign, task_description, responsible_id, status, due_date, observations } = req.body || {};
      const rows = await sql`
        UPDATE tasks SET
          client = COALESCE(${client ?? null}, client),
          project_campaign = COALESCE(${project_campaign ?? null}, project_campaign),
          task_description = COALESCE(${task_description ?? null}, task_description),
          responsible_id = COALESCE(${responsible_id ?? null}, responsible_id),
          status = COALESCE(${status ?? null}, status),
          due_date = COALESCE(${due_date ?? null}, due_date),
          observations = COALESCE(${observations ?? null}, observations)
        WHERE id = ${id as string}
        RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'Tarefa não encontrada' });
      return res.status(200).json(rows[0]);
    } catch (err: any) {
      console.error('[tasks PATCH]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM tasks WHERE id = ${id as string}`;
      return res.status(204).end();
    } catch (err: any) {
      console.error('[tasks DELETE]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
