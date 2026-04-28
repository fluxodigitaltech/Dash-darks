import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as XLSX from 'xlsx';
import { setCorsHeaders } from './_lib/cors';

const EVO_URL = 'https://evo-integracao.w12app.com.br/api/v1/members/summary-excel';
const EVO_DNS = process.env.EVO_DNS || 'darksgym';
const EVO_SECRET_KEY = process.env.EVO_SECRET_KEY || '47879638-81A1-4AC9-BBEE-77CDC04CBECF';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = 'Basic ' + Buffer.from(`${EVO_DNS}:${EVO_SECRET_KEY}`).toString('base64');
    const response = await fetch(EVO_URL, { headers: { Authorization: auth } });

    if (!response.ok) {
      const body = await response.text();
      return res.status(200).json({ error: `EVO API ${response.status}`, details: body });
    }

    const buffer = await response.arrayBuffer();
    const wb = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[evo-proxy]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
