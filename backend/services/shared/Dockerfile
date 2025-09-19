# Optimized Shared Service Dockerfile with Multiple Registry Support
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
COPY package*.json ./
COPY tsconfig.json ./

# Copy .npmrc if exists for registry configuration
COPY .npmrc* ./

# Install production dependencies with registry fallbacks
RUN (npm ci --omit=dev || \
     (npm config set registry https://registry.npmmirror.com/ && npm ci --omit=dev) || \
     (npm config set registry https://registry.yarnpkg.com/ && npm ci --omit=dev) || \
     (npm config set registry https://registry.npmjs.org/ && npm ci --omit=dev)) && \
    npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY .npmrc* ./

# Install all dependencies with fallbacks
RUN (npm ci || \
     (npm config set registry https://registry.npmmirror.com/ && npm ci) || \
     (npm config set registry https://registry.yarnpkg.com/ && npm ci) || \
     (npm config set registry https://registry.npmjs.org/ && npm ci))

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 shared

# Copy built application and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Change ownership to nodejs user
RUN chown -R shared:nodejs /app
USER shared

# Expose port (shared service doesn't run as a standalone service)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Shared service is healthy')" || exit 1

# Default command (mainly for testing)
CMD ["node", "dist/index.js"]
