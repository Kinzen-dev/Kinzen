#!/bin/sh
set -e

echo "🚀 Starting Kinzen Backend..."

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
