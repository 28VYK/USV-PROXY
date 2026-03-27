FROM node:18-alpine

# Setam un director de lucru pentru a rula aplicatia
WORKDIR /app

# Setam NODE_ENV pentru productie
ENV NODE_ENV=production

# Gid-ul si Uid-ul folosite de sistemul intern de la Alpine (izolare si memorie mica)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY package*.json ./
RUN npm ci --omit=dev

# Am transferat deja doar fisierele necesare in directorul curent.
COPY --chown=nextjs:nodejs . ./

RUN npm run build

# Pentru output standalone, server.js cauta static assets in .next/standalone/.next/static
RUN mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static

# Reducem numarul de procese, setam heap limitat in V8 (120MB)
ENV NODE_OPTIONS="--max-old-space-size=120"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

EXPOSE 3000

# Pornim serverul standalone generat de Next
CMD ["node", ".next/standalone/server.js"]
