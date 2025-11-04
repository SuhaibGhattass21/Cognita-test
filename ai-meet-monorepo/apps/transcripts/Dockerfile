# Multi-stage build for transcripts service
FROM node:20-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy shared libraries
COPY libs ./libs

# Copy transcripts service files specifically
COPY apps/transcripts/prisma ./apps/transcripts/prisma/
COPY apps/transcripts/src ./apps/transcripts/src/
COPY apps/transcripts/tsconfig*.json ./apps/transcripts/
COPY apps/transcripts/project.json ./apps/transcripts/

# Copy meeting prisma for shared client generation
COPY apps/meeting/prisma ./apps/meeting/prisma/

# Copy environment file
COPY .env.transcripts ./.env

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma clients for both services (libs require both)
RUN pnpm dlx prisma generate --schema=apps/transcripts/prisma/schema.prisma
RUN pnpm dlx prisma generate --schema=apps/meeting/prisma/schema.prisma

# Build the transcripts service
RUN pnpm nx build transcripts --prod

# Production stage
FROM node:20-alpine AS runtime

# Enable corepack for pnpm
RUN corepack enable

# Create app user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist/apps/transcripts ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/transcripts/prisma ./prisma/

# Copy environment file
COPY --from=builder /app/.env ./.env

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set correct ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/transcripts/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "main.cjs"]