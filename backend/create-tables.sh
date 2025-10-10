#!/bin/sh
set -e

echo "🚀 Creating Database Tables - FORCE MODE"
echo "========================================"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    exit 1
fi

echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."

# Force create tables
echo "🚀 FORCING database table creation..."
npx prisma db push --accept-data-loss --force-reset

echo "🔍 Checking if tables were created..."
echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" | npx prisma db execute --stdin

echo "✅ Database tables created successfully!"
