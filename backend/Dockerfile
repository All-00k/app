# ==============================================================================
# 🔥 CodeArena Backend - Production Multi-Stage Dockerfile
# ==============================================================================

# ── Stage 1: Build & Dependencies ──
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# ── Stage 2: Production Runtime ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy installed production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy backend source code
COPY src/ ./src/

# Change ownership to non-root user
USER nodejs

# Expose backend API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start Express server
CMD ["node", "src/server.js"]
