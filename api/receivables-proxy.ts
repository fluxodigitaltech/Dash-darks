import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as XLSX from 'xlsx';
import { setCorsHeaders } from './_lib/cors';

const EVO_URL = 'https://evo-integracao.w12app.com.br/api/v1/receivables/summary-excel';
const EVO_DNS = process.env.EVO_DNS || 'darksgym';
const EVO_SECRET_KEY = process.env.EVO_SECRET_KEY || '47879638-81A1-4AC9-BBEE-77CDC04CBECF';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let { dtLancamentoDe, dtLancamentoAte } = req.query as Record<string, string>;
    if (!dtLancamentoDe || !dtLancamentoAte) {
      const now = new Date();
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      dtLancamentoDe = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      dtLancamentoAte = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }

    const url = `${EVO_URL}?dtLancamentoDe=${dtLancamentoDe}&dtLancamentoAte=${dtLancamentoAte}`;
    const auth = 'Basic ' + Buffer.from(`${EVO_DNS}:${EVO_SECRET_KEY}`).toString('base64');
    const response = await fetch(url, { headers: { Authorization: auth } });

    if (!response.ok) {
      return res.status(200).json({ error: `EVO API ${response.status}` });
    }

    const buffer = await response.arrayBuffer();
    const wb = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const normalized = raw.map((row) => {
      const nr: Record<string, any> = {};
      for (const k in row) nr[k.trim()] = row[k];
      return nr;
    });

    return res.status(200).json({ data: normalized });
  } catch (err: any) {
    console.error('[receivables-proxy]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
