#!/bin/bash

# Quick database check script for Kinzen

echo "📊 Kinzen Database Status"
echo "=========================="
echo ""

# Check if database is running
if docker ps | grep -q kinzen-postgres-local; then
    echo "✅ Database is running"
else
    echo "❌ Database is not running. Start with: docker compose -f infrastructure/docker-compose.local.yml up -d postgres"
    exit 1
fi

echo ""
echo "👥 Total Users:"
docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local -t -c "SELECT COUNT(*) FROM users;"

echo ""
echo "📋 Latest Registered Users:"
docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local -c "SELECT email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "🔑 Active Refresh Tokens:"
docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local -t -c "SELECT COUNT(*) FROM refresh_tokens;"

echo ""
echo "📊 All Tables:"
docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local -c "\dt"

echo ""
echo "💡 To open Prisma Studio (GUI): cd backend && npx prisma studio"
echo "💡 To connect via CLI: docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local"

