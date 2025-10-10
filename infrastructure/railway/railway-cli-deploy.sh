#!/bin/bash
set -e

echo "🚂 Railway CLI Deployment"
echo "========================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️ Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged into Railway. Please login...${NC}"
    railway login
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"

# Generate JWT secrets
echo "🔐 Generating JWT secrets..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo -e "${GREEN}✅ JWT secrets generated${NC}"

# Create Railway project
echo "🚀 Creating Railway project..."
railway new --name "kinzen-backend-production"

# Link to the project
echo "🔗 Linking to project..."
railway link

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add --database postgres

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set API_PREFIX=api/v1
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
railway variables set JWT_EXPIRES_IN=15m
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set CORS_ORIGINS="*"

echo -e "${GREEN}✅ Environment variables set${NC}"

# Deploy backend
echo "🚀 Deploying backend..."
cd ../../backend
railway up

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "📋 Your secrets:"
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo ""
echo -e "${YELLOW}⚠️ Save these secrets securely!${NC}"
echo ""
echo "🔗 Get your backend URL:"
echo "railway domain"
echo ""
echo "📊 View logs:"
echo "railway logs"
