FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS builder

COPY prisma ./prisma/
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finansal_build?schema=public npx prisma generate

COPY . .
RUN npm run build

FROM deps AS migration

COPY prisma ./prisma/
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN mkdir -p uploads logs \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/health || exit 1

CMD ["node", "dist/index.js"]
