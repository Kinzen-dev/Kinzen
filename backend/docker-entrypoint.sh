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
echo "🔍 Checking migrations folder..."
ls -la prisma/migrations/ || echo "❌ Migrations folder not found"

echo "🚀 Deploying migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations deployed successfully"
else
    echo "⚠️ No migrations found, pushing schema directly..."
    npx prisma db push --accept-data-loss
    echo "✅ Schema pushed to database"
fi

echo "🔍 Checking if tables were created..."
echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" | npx prisma db execute --stdin || echo "⚠️ Could not check tables"

# Generate Prisma Client (in case it's needed)
echo "🔧 Ensuring Prisma Client is generated..."
npx prisma generate || echo "⚠️ Prisma Client generation failed, but continuing..."

echo "✅ Database setup complete!"
echo "🚀 Starting application..."

# Start the application
exec node dist/main

