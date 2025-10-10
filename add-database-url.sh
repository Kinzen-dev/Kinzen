#!/bin/bash
set -e

echo "🗄️ Adding DATABASE_URL to Railway Backend Service"
echo "================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Database URL
DATABASE_URL="postgresql://postgres:dPQmPVXNmPoNAMLxgmDXuQeqbqtKUVRq@tramway.proxy.rlwy.net:36236/railway"

echo "🔗 Linking to Railway project..."
railway link --project kinzen-backend-production

echo "⚙️ Adding DATABASE_URL environment variable..."
railway variables --set "DATABASE_URL=$DATABASE_URL"

echo -e "${GREEN}✅ DATABASE_URL added successfully${NC}"
echo ""
echo -e "${BLUE}📋 DATABASE_URL:${NC}"
echo "$DATABASE_URL"
echo ""
echo -e "${GREEN}🎉 Database connection configured!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Check Railway dashboard to confirm the variable is set"
echo "2. Redeploy your backend service if needed"
echo "3. Test the database connection"
echo ""
echo -e "${GREEN}🎊 Your backend should now connect to PostgreSQL!${NC}"
