#!/bin/bash
set -e

echo "🚂 Creating Backend Service - Infrastructure as Code"
echo "================================================="

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
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"

# Link to project
echo "🔗 Linking to Railway project..."
railway link --project kinzen-backend-production

# Create backend service
echo "🚀 Creating backend service..."
railway add

# Set environment variables
echo "⚙️ Setting environment variables..."

# Create a script to set all variables
cat > /tmp/set_env_vars.sh << EOF
#!/bin/bash
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3001"
railway variables --set "API_PREFIX=api/v1"
railway variables --set "JWT_SECRET=$JWT_SECRET"
railway variables --set "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
railway variables --set "JWT_EXPIRES_IN=15m"
railway variables --set "JWT_REFRESH_EXPIRES_IN=7d"
railway variables --set "CORS_ORIGINS=*"
EOF

chmod +x /tmp/set_env_vars.sh

# Execute the script
if /tmp/set_env_vars.sh; then
    echo -e "${GREEN}✅ Environment variables set successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Some variables may not have been set. Check Railway dashboard.${NC}"
fi

# Clean up
rm -f /tmp/set_env_vars.sh

# Deploy backend
echo "🚀 Deploying backend..."
cd backend
railway up

echo -e "${GREEN}✅ Backend deployed${NC}"

# Go back to root
cd ..

# Get domain
echo "📊 Getting deployment information..."
DOMAIN=$(railway domain 2>/dev/null || echo "Check Railway dashboard for domain")

echo ""
echo -e "${GREEN}🎉 Backend Service Created Successfully!${NC}"
echo "============================================="
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
echo -e "${GREEN}🎊 Backend service created with Infrastructure as Code!${NC}"
