ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm-slim AS builder
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --include=optional

# Copy source and build
COPY . .
RUN npm run build


FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Create non-root user
RUN useradd -m -u 1001 nextjs

# Copy the standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
USER 1001

CMD ["node", "server.js"]

