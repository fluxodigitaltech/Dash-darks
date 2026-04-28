# Configuração do Banco — Migrando do Supabase para Neon

## 1. Criar conta no Neon (gratuito)

1. Acesse https://console.neon.tech
2. Crie um novo projeto (ex: `darks-gym`)
3. Copie a **Connection String** (formato: `postgresql://user:pass@host/dbname?sslmode=require`)

## 2. Criar o schema no banco

1. No console do Neon, abra o **SQL Editor**
2. Cole e execute o conteúdo de `database/schema.sql`

## 3. Criar o primeiro usuário (admin)

Após o deploy, acesse via `curl` ou Postman:

```bash
curl -X POST https://SEU-DOMINIO.vercel.app/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "SuaSenha123", "name": "Seu Nome"}'
```

> ⚠️ Este endpoint só funciona UMA VEZ (quando não há nenhum usuário no banco).
> Após criar o primeiro usuário, tente novamente e você verá "Setup já realizado".

## 4. Configurar variáveis de ambiente no Vercel

No painel do Vercel → Settings → Environment Variables, adicione:

| Variável              | Valor                                      |
|-----------------------|--------------------------------------------|
| `DATABASE_URL`        | Sua connection string do Neon              |
| `JWT_SECRET`          | Uma string aleatória longa e segura        |
| `EVO_DNS`             | `darksgym`                                 |
| `EVO_SECRET_KEY`      | `47879638-81A1-4AC9-BBEE-77CDC04CBECF`     |
| `EVOLUTION_API_URL`   | URL da sua instância Evolution API         |
| `EVOLUTION_API_KEY`   | Chave da Evolution API                     |
| `VITE_TASK_WEBHOOK_URL` | URL do webhook de tarefas (opcional)     |

> Para o `JWT_SECRET`, use algo como: `openssl rand -base64 64`

## 5. Instalar dependências e fazer deploy

```bash
cd dash-darks
pnpm install
# Commit e push para o GitHub — o Vercel fará o deploy automaticamente
```

## Estrutura das APIs (Vercel API Routes)

| Endpoint                         | Método    | Descrição                        |
|----------------------------------|-----------|----------------------------------|
| `/api/auth/login`                | POST      | Login (retorna JWT)              |
| `/api/auth/me`                   | GET       | Verifica sessão                  |
| `/api/auth/setup`                | POST      | Cria 1º usuário (apenas 1 vez)   |
| `/api/tasks`                     | GET/POST  | Listar/criar tarefas             |
| `/api/tasks/[id]`                | PATCH/DEL | Atualizar/excluir tarefa         |
| `/api/monthly-stats`             | GET       | Histórico de adimplentes         |
| `/api/monthly-stats/save`        | POST      | Salvar contagem do mês atual     |
| `/api/evo-proxy`                 | GET       | Membros (EVO API)                |
| `/api/balance-proxy`             | GET       | Saldo (Steinhq)                  |
| `/api/celebrations-proxy`        | GET       | Comemorações (Steinhq)           |
| `/api/followers-proxy`           | GET       | Seguidores (Steinhq)             |
| `/api/mkt-proxy`                 | GET       | Marketing (Steinhq)              |
| `/api/prospects-proxy`           | GET       | Prospects (EVO API)              |
| `/api/receivables-proxy`         | GET       | Recebíveis (EVO API)             |
| `/api/evolution-fetch-instances` | GET       | Instâncias WhatsApp              |
| `/api/evolution-send-message`    | POST      | Enviar mensagem WhatsApp         |
