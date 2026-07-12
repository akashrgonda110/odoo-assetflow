# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps
# Install all dependencies (including devDependencies needed for the build).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder
# Runs `next build` which emits .next/standalone when output:"standalone"
# is set in next.config.ts.
# NEXT_PUBLIC_API_URL must be provided at build time so Next.js can inline it
# into the client bundle. Pass it via --build-arg in CI or docker compose.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Receive the public API URL at build time (defaults to backend service name)
ARG NEXT_PUBLIC_API_URL=http://backend:5000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runner
# Minimal image: copies only the standalone server output, public assets,
# and static files. Results in the smallest possible production image.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Add non-root user for security
RUN addgroup -S assetflow && adduser -S assetflow -G assetflow

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# The standalone build self-contains its own server.js and node_modules subset
COPY --from=builder --chown=assetflow:assetflow /app/.next/standalone ./
COPY --from=builder --chown=assetflow:assetflow /app/.next/static     ./.next/static
COPY --from=builder --chown=assetflow:assetflow /app/public           ./public

USER assetflow

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Healthcheck — verifies the root page responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Next.js standalone output produces a self-contained server.js
CMD ["node", "server.js"]
