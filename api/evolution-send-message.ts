import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_lib/cors';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const URL = process.env.EVOLUTION_API_URL;
  const KEY = process.env.EVOLUTION_API_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'EVOLUTION_API_URL/KEY não configurados.' });
  try {
    const { phone, message, instanceName, delay, presence } = req.body || {};
    if (!phone || !message || !instanceName) return res.status(400).json({ error: 'phone, message e instanceName obrigatórios.' });
    const r = await fetch(`${URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ number: phone, textMessage: { text: message }, options: { delay: delay || 1200, presence: presence || 'composing' } }),
    });
    if (!r.ok) return res.status(200).json({ error: `Evolution ${r.status}` });
    return res.status(200).json(await r.json());
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}
