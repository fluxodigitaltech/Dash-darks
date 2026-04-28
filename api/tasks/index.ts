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

  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const { status, responsible_id, page = '1', pageSize = '9' } = req.query as Record<string, string>;
      const pageNum = parseInt(page, 10) || 1;
      const pageSizeNum = parseInt(pageSize, 10) || 9;
      const offset = (pageNum - 1) * pageSizeNum;

      let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
      let dataQuery = 'SELECT * FROM tasks WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'Todos') {
        params.push(status);
        const cond = ` AND status = $${params.length}`;
        countQuery += cond;
        dataQuery += cond;
      }
      if (responsible_id && responsible_id !== 'Todos') {
        params.push(responsible_id);
        const cond = ` AND responsible_id = $${params.length}`;
        countQuery += cond;
        dataQuery += cond;
      }

      dataQuery += ` ORDER BY created_at DESC`;
      params.push(pageSizeNum);
      dataQuery += ` LIMIT $${params.length}`;
      params.push(offset);
      dataQuery += ` OFFSET $${params.length}`;

      const countResult = await sql.query(countQuery, params.slice(0, params.length - 2));
      const totalCount = Number(countResult.rows[0].total);

      const dataResult = await sql.query(dataQuery, params);
      return res.status(200).json({ tasks: dataResult.rows, totalCount });
    } catch (err: any) {
      console.error('[tasks GET]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { client, project_campaign, task_description, responsible_id, status, due_date, observations } = req.body || {};
      if (!task_description) return res.status(400).json({ error: 'task_description é obrigatório' });

      const rows = await sql`
        INSERT INTO tasks (client, project_campaign, task_description, responsible_id, status, due_date, observations, created_by)
        VALUES (${client || null}, ${project_campaign || null}, ${task_description}, ${responsible_id || null},
                ${status || 'Pendente'}, ${due_date || null}, ${observations || null}, ${payload.userId})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (err: any) {
      console.error('[tasks POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
