# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps
# Install production dependencies only, so the final image stays lean.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first to leverage layer caching
COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner
# Minimal production image: copies only node_modules + source.
# No devDependencies, no build tools.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Add non-root user for security
RUN addgroup -S assetflow && adduser -S assetflow -G assetflow

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# Own everything by the non-root user
RUN chown -R assetflow:assetflow /app

USER assetflow

# Expose API port
EXPOSE 5000

# Healthcheck — verifies the /api/health endpoint responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
