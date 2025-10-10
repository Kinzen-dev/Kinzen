# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL and other dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL and dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY --chown=nestjs:nodejs package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built application and prisma schema
COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nestjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nestjs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Fix Prisma permissions
RUN chown -R nestjs:nodejs /app/node_modules/.prisma
RUN chown -R nestjs:nodejs /app/node_modules/prisma

# Copy entrypoint script
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with migrations
CMD ["./docker-entrypoint.sh"]

