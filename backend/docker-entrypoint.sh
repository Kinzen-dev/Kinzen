#!/bin/sh
set -e

echo "🚀 Starting Kinzen Backend..."

# Debug: Check if DATABASE_URL is available
echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    echo "Available environment variables:"
    env | grep -E "(DATABASE|NODE|PORT)" || echo "No relevant env vars found"
    exit 1
else
    echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:20}..."
fi

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

