# Simple Railway-optimized Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for Prisma)
RUN npm install

# Copy source code
COPY . .

# Debug: Check if migrations exist
RUN echo "🔍 Checking migrations after COPY . ." && ls -la prisma/migrations/ || echo "❌ No migrations found"

# Ensure migrations are copied explicitly
COPY prisma/migrations ./prisma/migrations/

# Debug: Check migrations after explicit copy
RUN echo "🔍 Checking migrations after explicit copy" && ls -la prisma/migrations/ || echo "❌ Still no migrations found"

# Generate Prisma Client
RUN npm run prisma:generate

# Build application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Copy entrypoint script and table creation script
COPY docker-entrypoint.sh ./
COPY create-tables.sh ./
RUN chmod +x docker-entrypoint.sh create-tables.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with migrations
CMD ["./docker-entrypoint.sh"]
