import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as XLSX from 'xlsx';
import { getDb } from '../_lib/db';
import { verifyToken, getTokenFromHeader } from '../_lib/auth';
import { setCorsHeaders } from '../_lib/cors';

const EVO_URL = 'https://evo-integracao.w12app.com.br/api/v1/members/summary-excel';
const EVO_DNS = process.env.EVO_DNS || 'darksgym';
const EVO_SECRET_KEY = process.env.EVO_SECRET_KEY || '47879638-81A1-4AC9-BBEE-77CDC04CBECF';

function calcAdimplentes(members: any[]): number {
  return members
    .filter((m) => {
      const plan = (m.NomeContrato || '').toLowerCase();
      return !['influenciador', 'personal', 'combo 3 diárias', 'wellhub', 'totalpass'].some((p) => plan.includes(p));
    })
    .filter((m) => (m.StatusContrato || '').toLowerCase().includes('ativo')).length;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getTokenFromHeader(req.headers.authorization as string);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Não autenticado' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = 'Basic ' + Buffer.from(`${EVO_DNS}:${EVO_SECRET_KEY}`).toString('base64');
    const resp = await fetch(EVO_URL, { headers: { Authorization: auth } });
    if (!resp.ok) return res.status(200).json({ error: `EVO error: ${resp.status}` });

    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
    const members = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const count = calcAdimplentes(members);

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const sql = getDb();
    await sql`
      INSERT INTO monthly_member_stats (month_start_date, adimplentes_count, created_at)
      VALUES (${monthStart}, ${count}, NOW())
      ON CONFLICT (month_start_date) DO UPDATE SET adimplentes_count = EXCLUDED.adimplentes_count, created_at = NOW()
    `;

    return res.status(200).json({ message: `Salvo para ${monthStart}`, adimplentes_count: count });
  } catch (err: any) {
    console.error('[monthly-stats/save]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
