FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @coloc/api build

# Production
FROM node:22-alpine AS runner
WORKDIR /app

# Sharp needs vips
RUN apk add --no-cache vips-dev

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./
COPY --from=build /app/apps/api/src/db ./src/db
COPY --from=build /app/apps/api/drizzle.config.ts ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
