#!/bin/bash
set -e

echo "🚂 Railway Deployment Script"
echo "============================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway (opens browser)
echo "🔐 Logging into Railway..."
railway login

# Link to project (or create new one)
echo "🔗 Linking to Railway project..."
railway link

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add --database postgres

# Set environment variables
echo "⚙️ Setting environment variables..."

# Generate JWT secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Set variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set API_PREFIX=api/v1
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
railway variables set JWT_EXPIRES_IN=15m
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set CORS_ORIGINS="*"

echo -e "${GREEN}✅ Environment variables set!${NC}"
echo ""
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo ""
echo -e "${YELLOW}⚠️  Save these secrets securely!${NC}"

# Deploy
echo "🚀 Deploying to Railway..."
cd ../../backend
railway up

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Check deployment status: railway status"
echo "2. View logs: railway logs"
echo "3. Get domain: railway domain"

