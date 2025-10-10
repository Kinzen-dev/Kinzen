#!/bin/bash
set -e

echo "🚂 Railway Deployment - Infrastructure as Code"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Generate JWT secrets
echo "🔐 Generating JWT secrets..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo -e "${GREEN}✅ JWT secrets generated${NC}"

# Link to the correct project
echo "🔗 Linking to Railway project..."
railway link --project kinzen-backend-production

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables --set "NODE_ENV=production" --skip-deploys
railway variables --set "PORT=3001" --skip-deploys
railway variables --set "API_PREFIX=api/v1" --skip-deploys
railway variables --set "JWT_SECRET=$JWT_SECRET" --skip-deploys
railway variables --set "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" --skip-deploys
railway variables --set "JWT_EXPIRES_IN=15m" --skip-deploys
railway variables --set "JWT_REFRESH_EXPIRES_IN=7d" --skip-deploys
railway variables --set "CORS_ORIGINS=*" --skip-deploys

echo -e "${GREEN}✅ Environment variables set${NC}"

# Deploy backend
echo "🚀 Deploying backend..."
cd backend
railway up

echo -e "${GREEN}✅ Backend deployed${NC}"

# Get domain
echo "📊 Getting deployment information..."
DOMAIN=$(railway domain 2>/dev/null || echo "Check Railway dashboard")

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "================================"
echo ""
echo -e "${YELLOW}📋 Your JWT Secrets (save securely):${NC}"
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo ""
echo -e "${GREEN}🌐 Backend URL: $DOMAIN${NC}"
echo -e "${GREEN}🔗 API Endpoint: $DOMAIN/api/v1${NC}"
echo -e "${GREEN}📚 Swagger Docs: $DOMAIN/docs${NC}"
echo ""
echo -e "${BLUE}🧪 Test your deployment:${NC}"
echo "curl $DOMAIN/api/v1/health"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Update Vercel with: NEXT_PUBLIC_API_URL=$DOMAIN/api/v1"
echo "2. Update CORS_ORIGINS with your Vercel URL"
echo "3. Test the full stack"
echo ""
echo -e "${GREEN}🎊 All done! Your backend is deployed with Infrastructure as Code!${NC}"
