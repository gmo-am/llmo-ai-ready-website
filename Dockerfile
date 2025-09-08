ARG NODE_VERSION=22

# Dependencies stage - install all deps including devDeps
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder stage - build the application
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set dummy environment variables for build
ENV OPENAI_API_KEY=build-time-dummy \
    FIRECRAWL_API_KEY=build-time-dummy \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage - production only
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

