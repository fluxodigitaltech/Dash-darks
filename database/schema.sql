-- ============================================================
-- Schema do banco Neon PostgreSQL — Darks Gym Dashboard
-- Execute este script no SQL Editor do Neon (console.neon.tech)
-- ============================================================

-- Tabela de usuários (substitui Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  client            TEXT,
  project_campaign  TEXT,
  task_description  TEXT NOT NULL,
  responsible_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(50) DEFAULT 'Pendente'
                      CHECK (status IN ('Pendente', 'Em Progresso', 'Concluído', 'Cancelado')),
  due_date          DATE,
  observations      TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela de estatísticas mensais de adimplentes
CREATE TABLE IF NOT EXISTS monthly_member_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start_date  DATE UNIQUE NOT NULL,
  adimplentes_count INTEGER NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_responsible ON tasks(responsible_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_date ON monthly_member_stats(month_start_date);
