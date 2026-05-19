FROM node:18-alpine

# Install OpenVPN and iproute2 (for advanced routing commands inside the container)
RUN apk add --no-cache openvpn iproute2

# Set working directory
WORKDIR /app

# Set NODE_ENV for production
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy all project files
COPY . .

# Build the Next.js application
RUN npm run build

# For standalone output, Next.js server.js looks for static assets in .next/standalone/.next/static
RUN mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static

# Limit heap memory in V8 engine to 120MB for low-memory VPS stability
ENV NODE_OPTIONS="--max-old-space-size=120"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

# Run the entrypoint script (must run as root inside container to establish VPN and modify internal container routing)
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
