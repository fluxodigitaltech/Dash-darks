import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_lib/cors';

const EVO_URL = 'https://evo-integracao-api.w12app.com.br/api/v1/prospects';
const EVO_DNS = process.env.EVO_DNS || 'darksgym';
const EVO_SECRET_KEY = process.env.EVO_SECRET_KEY || '47879638-81A1-4AC9-BBEE-77CDC04CBECF';
const PAGE_SIZE = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let { registerDateStart, registerDateEnd } = req.query as Record<string, string>;
    if (!registerDateStart || !registerDateEnd) {
      const now = new Date();
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      registerDateStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      registerDateEnd = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }

    const auth = 'Basic ' + Buffer.from(`${EVO_DNS}:${EVO_SECRET_KEY}`).toString('base64');
    let all: any[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${EVO_URL}?registerDateStart=${registerDateStart}&registerDateEnd=${registerDateEnd}&take=${PAGE_SIZE}&skip=${skip}`;
      const r = await fetch(url, { headers: { Authorization: auth } });
      if (!r.ok) return res.status(r.status).json({ error: `EVO API ${r.status}` });
      const data = await r.json();
      if (Array.isArray(data)) {
        all = all.concat(data);
        hasMore = data.length >= PAGE_SIZE;
        skip += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return res.status(200).json({ data: all });
  } catch (err: any) {
    console.error('[prospects-proxy]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
