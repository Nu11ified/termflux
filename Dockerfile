FROM oven/bun:1.3.3-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy node_modules for serverExternalPackages
COPY --from=builder /app/node_modules ./node_modules
# Copy files needed for migrations
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/lib/db/schema.ts ./src/lib/db/
COPY --from=builder /app/start.sh ./
RUN chmod +x start.sh

USER nextjs

EXPOSE 3000 3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
