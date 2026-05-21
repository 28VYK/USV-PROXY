FROM node:18-alpine

# ─────────────────────────────────────────────────────────────────────────────
# Security: No longer needs openvpn or iproute2.
# OpenVPN now runs in its own dedicated sidecar container (usv-vpn).
# This container is purely a Next.js application — no root required.
# ─────────────────────────────────────────────────────────────────────────────

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy all project files (owned by root during build — that is fine)
COPY . .

# Build the Next.js application
RUN npm run build

# For standalone output, Next.js server.js looks for static assets in .next/standalone/.next/static
RUN mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static

# ─────────────────────────────────────────────────────────────────────────────
# Switch to non-root user for runtime security.
# The node user (uid 1000) is pre-created by the node:18-alpine base image.
# ─────────────────────────────────────────────────────────────────────────────
RUN chown -R node:node /app
USER node

# Limit heap memory for low-memory VPS stability
ENV NODE_OPTIONS="--max-old-space-size=120"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Directly launch the Next.js standalone server — no entrypoint script needed.
# VPN initialization is now handled entirely by the usv-vpn sidecar container.
CMD ["node", ".next/standalone/server.js"]
