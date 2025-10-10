#!/bin/sh
set -e

echo "🚀 Running Prisma Migrations Manually"
echo "===================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    exit 1
fi

echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."

# Check migrations folder
echo "🔍 Checking migrations folder..."
ls -la prisma/migrations/ || echo "❌ Migrations folder not found"

# Run migrations
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Check tables
echo "🔍 Checking if tables were created..."
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

echo "✅ Migrations completed successfully!"
