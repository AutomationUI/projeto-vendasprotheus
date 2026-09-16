# ─── Multi-Stage Production Dockerfile for SaaS (VendasProtheus / CRM Flow) ───
# Stage 1: Build Frontend SPA & Backend Bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for maximum layer caching
COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --ignore-scripts

# Copy source files
COPY tsconfig*.json ./
COPY vite.config.ts tailwind.config.ts postcss.config.js components.json index.html ./
COPY public/ ./public/
COPY src/ ./src/
COPY server/ ./server/

# Build Frontend Static Assets (dist/)
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

# Install dumb-init for robust process signal handling in containers
RUN apk add --no-cache dumb-init curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create dedicated non-root user for SaaS container security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package descriptors and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built frontend assets and server sources
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig*.json ./

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Robust Container Healthcheck (verifies Express API + HTTP router)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--loader", "tsx", "server/src/index.ts"]
