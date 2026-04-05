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

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=build-frontend /app/dist ./dist

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
