import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import loginHandler from './api/auth/login';
import meHandler from './api/auth/me';
import setupHandler from './api/auth/setup';
import tasksHandler from './api/tasks/index';
import taskByIdHandler from './api/tasks/[id]';
import monthlyStatsHandler from './api/monthly-stats/index';
import monthlyStatsSaveHandler from './api/monthly-stats/save';
import balanceProxyHandler from './api/balance-proxy';
import celebrationsProxyHandler from './api/celebrations-proxy';
import evoProxyHandler from './api/evo-proxy';
import evolutionFetchHandler from './api/evolution-fetch-instances';
import evolutionSendHandler from './api/evolution-send-message';
import followersProxyHandler from './api/followers-proxy';
import healthHandler from './api/health';
import mktProxyHandler from './api/mkt-proxy';
import prospectsProxyHandler from './api/prospects-proxy';
import receivablesProxyHandler from './api/receivables-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth
app.all('/api/auth/login', (req, res) => loginHandler(req as any, res as any));
app.all('/api/auth/me', (req, res) => meHandler(req as any, res as any));
app.all('/api/auth/setup', (req, res) => setupHandler(req as any, res as any));

// Tasks
app.all('/api/tasks', (req, res) => tasksHandler(req as any, res as any));
app.all('/api/tasks/:id', (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return taskByIdHandler(req as any, res as any);
});

// Monthly stats (save must come before the generic route)
app.all('/api/monthly-stats/save', (req, res) => monthlyStatsSaveHandler(req as any, res as any));
app.all('/api/monthly-stats', (req, res) => monthlyStatsHandler(req as any, res as any));

// Proxies
app.all('/api/balance-proxy', (req, res) => balanceProxyHandler(req as any, res as any));
app.all('/api/celebrations-proxy', (req, res) => celebrationsProxyHandler(req as any, res as any));
app.all('/api/evo-proxy', (req, res) => evoProxyHandler(req as any, res as any));
app.all('/api/evolution-fetch-instances', (req, res) => evolutionFetchHandler(req as any, res as any));
app.all('/api/evolution-send-message', (req, res) => evolutionSendHandler(req as any, res as any));
app.all('/api/followers-proxy', (req, res) => followersProxyHandler(req as any, res as any));
app.all('/api/health', (req, res) => healthHandler(req as any, res as any));
app.all('/api/mkt-proxy', (req, res) => mktProxyHandler(req as any, res as any));
app.all('/api/prospects-proxy', (req, res) => prospectsProxyHandler(req as any, res as any));
app.all('/api/receivables-proxy', (req, res) => receivablesProxyHandler(req as any, res as any));

// Static frontend
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
});
