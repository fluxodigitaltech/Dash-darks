# ─────────────────────────────────────────────
# Stage 1: install all dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --no-frozen-lockfile

# ─────────────────────────────────────────────
# Stage 2: build frontend + bundle server
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Vite frontend → dist/
RUN pnpm build

# Bundle Express server + all API handlers → dist/server.cjs
RUN node_modules/.bin/esbuild server.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile=dist/server.cjs \
    --format=cjs \
    --external:express \
    --external:@neondatabase/serverless \
    --external:xlsx

# ─────────────────────────────────────────────
# Stage 3: lean production image
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
