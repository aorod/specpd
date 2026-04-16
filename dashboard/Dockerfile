# ── Stage 1: Build do frontend ───────────────────────────────────────────────
FROM node:20-alpine AS build-frontend
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Backend de produção (serve API + frontend estático) ──────────────
FROM node:20-alpine AS production
WORKDIR /app

# Ferramentas de build necessárias para compilar better-sqlite3 (módulo nativo C++)
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Remove ferramentas de build para reduzir o tamanho final da imagem
RUN apk del python3 make g++

COPY server/ ./server/
COPY --from=build-frontend /app/dist ./dist

EXPOSE 3001
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/cache/status || exit 1

CMD ["node", "server/index.js"]
