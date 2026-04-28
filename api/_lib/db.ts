import { neon } from '@neondatabase/serverless';

/**
 * Retorna a instância do banco. Lança erro apenas quando chamado,
 * não no carregamento do módulo (evita 500 em cascata).
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL não configurada. Adicione nas Variáveis de Ambiente do Vercel: Settings → Environment Variables'
    );
  }
  return neon(url);
}
