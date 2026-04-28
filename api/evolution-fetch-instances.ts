import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_lib/cors';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const URL = process.env.EVOLUTION_API_URL;
  const KEY = process.env.EVOLUTION_API_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'EVOLUTION_API_URL/KEY não configurados.' });
  try {
    const r = await fetch(`${URL}/instance/fetch-all`, { headers: { apikey: KEY } });
    if (!r.ok) return res.status(200).json({ error: `Evolution ${r.status}` });
    return res.status(200).json(await r.json());
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}
