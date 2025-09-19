# Employee Service Dockerfile
FROM node:20-alpine AS base

# Configure npm settings globally for all stages
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set maxsockets 15 && \
    npm config set progress false && \
    npm config set loglevel warn

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY employee-service/package*.json ./
COPY employee-service/tsconfig.json ./
COPY shared ./shared

# Install production dependencies with registry fallbacks
RUN (npm ci --omit=dev || \
     (npm config set registry https://registry.npmmirror.com/ && npm ci --omit=dev) || \
     (npm config set registry https://registry.yarnpkg.com/ && npm ci --omit=dev) || \
     (npm config set registry https://registry.npmjs.org/ && npm ci --omit=dev)) && \
    npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy and setup shared module to match package.json file reference
COPY shared ../shared
WORKDIR /shared
RUN npm ci && npm run build

# Go back to service directory and copy service files
WORKDIR /app
COPY employee-service/package*.json ./
COPY employee-service/tsconfig.json ./
COPY employee-service/src ./src
COPY employee-service/prisma ./prisma

# Install all dependencies (including dev dependencies) with fallbacks
RUN (npm ci || \
     (npm config set registry https://registry.npmmirror.com/ && npm ci) || \
     (npm config set registry https://registry.yarnpkg.com/ && npm ci) || \
     (npm config set registry https://registry.npmjs.org/ && npm ci))

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Install curl for health checks and OpenSSL for Prisma with repository fallbacks
RUN (apk add --no-cache curl openssl || \
     (echo "http://dl-cdn.alpinelinux.org/alpine/v3.22/main" > /etc/apk/repositories && \
      echo "http://dl-cdn.alpinelinux.org/alpine/v3.22/community" >> /etc/apk/repositories && \
      apk update && apk add --no-cache curl openssl) || \
     (echo "https://alpine.global.ssl.fastly.net/alpine/v3.22/main" > /etc/apk/repositories && \
      echo "https://alpine.global.ssl.fastly.net/alpine/v3.22/community" >> /etc/apk/repositories && \
      apk update && apk add --no-cache curl openssl) || \
     (echo "https://mirror.yandex.ru/mirrors/alpine/v3.22/main" > /etc/apk/repositories && \
      echo "https://mirror.yandex.ru/mirrors/alpine/v3.22/community" >> /etc/apk/repositories && \
      apk update && apk add --no-cache curl openssl))

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 employee

# Copy built application and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
# Copy built shared module to make it available at runtime
COPY --from=builder /shared/dist ./node_modules/@hrms/shared/dist
COPY --from=builder /shared/package.json ./node_modules/@hrms/shared/package.json
COPY --from=builder /shared/node_modules ./node_modules/@hrms/shared/node_modules

# Create uploads and logs directories
RUN mkdir -p uploads/profiles uploads/documents logs && chown -R employee:nodejs /app
USER employee

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the application with proper Prisma setup
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node dist/index.js"]
