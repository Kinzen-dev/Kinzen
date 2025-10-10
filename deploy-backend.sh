#!/bin/bash
set -e

echo "🚀 Deploying Kinzen Backend to Railway"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found. Please install it first:${NC}"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged into Railway. Please login first:${NC}"
    echo "railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"

# Generate JWT secrets
echo "🔐 Generating JWT secrets..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo -e "${GREEN}✅ JWT secrets generated${NC}"

# Instructions for manual setup
echo ""
echo -e "${YELLOW}📋 Manual Setup Instructions:${NC}"
echo "Since Railway CLI has some interactive limitations, please follow these steps:"
echo ""
echo "1. 🌐 Open Railway Dashboard:"
echo "   https://railway.app/dashboard"
echo ""
echo "2. 🎯 Select your project: 'reliable-upliftment'"
echo ""
echo "3. ⚙️ Go to your backend service (kinzen-backend) → Variables tab"
echo ""
echo "4. 🔧 Add these environment variables:"
echo "   NODE_ENV=production"
echo "   PORT=3001"
echo "   API_PREFIX=api/v1"
echo "   JWT_SECRET=$JWT_SECRET"
echo "   JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "   JWT_EXPIRES_IN=15m"
echo "   JWT_REFRESH_EXPIRES_IN=7d"
echo "   CORS_ORIGINS=*"
echo ""
echo "5. 🚀 Click 'Deploy' or wait for auto-deployment"
echo ""
echo "6. 📊 Get your backend URL from Settings → Domains"
echo ""
echo -e "${GREEN}🎉 After setup, your backend will be live!${NC}"
echo ""
echo -e "${YELLOW}💾 Save these secrets securely:${NC}"
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo ""
echo "🔗 Next steps after deployment:"
echo "1. Update Vercel with your Railway backend URL"
echo "2. Test your API endpoints"
echo "3. Update CORS with your Vercel URL"
