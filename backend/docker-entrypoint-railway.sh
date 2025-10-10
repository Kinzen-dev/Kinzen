#!/bin/sh
set -e

echo "🚀 Starting Kinzen Backend..."

# Set Prisma environment variables for Alpine Linux
export PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-1.1.x.so.node
export PRISMA_QUERY_ENGINE_BINARY=/app/node_modules/.prisma/client/query-engine-linux-musl-openssl-1.1.x

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma Client (in case it's needed)
echo "🔧 Ensuring Prisma Client is generated..."
npx prisma generate

echo "✅ Database setup complete!"
echo "🚀 Starting application..."

# Start the application
exec node dist/main
