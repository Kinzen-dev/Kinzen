#!/bin/bash
set -e

echo "🚂 Railway Infrastructure as Code - Final Deployment"
echo "===================================================="

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

# Link to project
echo "🔗 Linking to Railway project..."
railway link --project kinzen-backend-production

# Deploy backend (this will create the service if it doesn't exist)
echo "🚀 Deploying backend service..."
cd backend

# Deploy the backend
railway up

echo -e "${GREEN}✅ Backend service deployed${NC}"

# Go back to root
cd ..

# Now set environment variables
echo "⚙️ Setting environment variables..."

# Create a temporary script to set variables with proper service linking
cat > /tmp/set_vars.sh << 'EOF'
#!/bin/bash
# Link to the backend service
railway service kinzen-backend 2>/dev/null || railway service

# Set variables
railway variables --set "NODE_ENV=production" --skip-deploys
railway variables --set "PORT=3001" --skip-deploys  
railway variables --set "API_PREFIX=api/v1" --skip-deploys
railway variables --set "JWT_SECRET=$1" --skip-deploys
railway variables --set "JWT_REFRESH_SECRET=$2" --skip-deploys
railway variables --set "JWT_EXPIRES_IN=15m" --skip-deploys
railway variables --set "JWT_REFRESH_EXPIRES_IN=7d" --skip-deploys
railway variables --set "CORS_ORIGINS=*" --skip-deploys
EOF

chmod +x /tmp/set_vars.sh
/tmp/set_vars.sh "$JWT_SECRET" "$JWT_REFRESH_SECRET"

echo -e "${GREEN}✅ Environment variables set${NC}"

# Clean up
rm -f /tmp/set_vars.sh

# Get domain
echo "📊 Getting deployment information..."
DOMAIN=$(railway domain 2>/dev/null || echo "Check Railway dashboard for domain")

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
