# ─── Stage 1: deps ────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only the manifest first so this layer is cached unless deps change
COPY package*.json ./

# Install production deps only
RUN npm ci --omit=dev

# ─── Stage 2: runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package*.json ./

# Own everything as the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Backend listens on 5000 (matches env.js default)
EXPOSE 5000

# Health-check: hit the /api/health endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
