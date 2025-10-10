#!/bin/sh
set -e

echo "🚀 Starting Kinzen Backend..."

# Load environment variables from Railway
echo "🔍 Loading environment variables..."

# Debug: Show all environment variables
echo "📋 Available environment variables:"
env | sort

# Check if DATABASE_URL is available
echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    echo "Trying to load from Railway..."
    
    # Try to get DATABASE_URL from Railway's environment
    if [ -f "/app/.env" ]; then
        echo "📄 Loading from .env file..."
        export $(cat /app/.env | xargs)
    fi
    
    # Check again
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL still not found!"
        echo "Available DATABASE-related variables:"
        env | grep -i database || echo "No DATABASE variables found"
        exit 1
    fi
fi

echo "✅ DATABASE_URL is set: ${DATABASE_URL:0:30}..."

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
