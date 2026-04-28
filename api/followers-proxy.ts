import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_lib/cors';
const URL = 'https://api.steinhq.com/v1/storages/68cd91e5affba40a62fe17e9/seguidores';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const r = await fetch(URL);
    if (!r.ok) return res.status(200).json({ error: `Steinhq ${r.status}` });
    return res.status(200).json(await r.json());
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}
