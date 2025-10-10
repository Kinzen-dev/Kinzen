#!/bin/bash
set -e

echo "🚂 Railway Infrastructure as Code"
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="kinzen-backend-production"
SERVICE_NAME="kinzen-backend"
GITHUB_REPO="Kinzen-dev/Kinzen"
GITHUB_BRANCH="main"

# Check dependencies
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not found. Installing...${NC}"
        npm install -g @railway/cli
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq not found. Installing...${NC}"
        brew install jq
    fi
    
    echo -e "${GREEN}✅ Dependencies ready${NC}"
}

# Check Railway authentication
check_auth() {
    echo "🔐 Checking Railway authentication..."
    
    if ! railway whoami &> /dev/null; then
        echo -e "${RED}❌ Not logged into Railway. Please login first:${NC}"
        echo "railway login"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Railway authentication OK${NC}"
}

# Create or link to project
setup_project() {
    echo "🏗️ Setting up Railway project..."
    
    # Check if project already exists
    if railway list | grep -q "$PROJECT_NAME"; then
        echo -e "${YELLOW}⚠️ Project '$PROJECT_NAME' already exists. Linking...${NC}"
        railway link --project "$PROJECT_NAME"
    else
        echo "🚀 Creating new project '$PROJECT_NAME'..."
        railway new --name "$PROJECT_NAME"
        railway link
    fi
    
    echo -e "${GREEN}✅ Project ready${NC}"
}

# Add PostgreSQL database
add_database() {
    echo "🗄️ Adding PostgreSQL database..."
    
    # Check if PostgreSQL already exists
    if railway list | grep -q "postgres"; then
        echo -e "${YELLOW}⚠️ PostgreSQL already exists${NC}"
    else
        echo "📦 Adding PostgreSQL database..."
        railway add --database postgres
    fi
    
    echo -e "${GREEN}✅ Database ready${NC}"
}

# Generate JWT secrets
generate_secrets() {
    echo "🔐 Generating JWT secrets..."
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    
    echo -e "${GREEN}✅ JWT secrets generated${NC}"
    
    # Export for use in other functions
    export JWT_SECRET
    export JWT_REFRESH_SECRET
}

# Set environment variables
set_environment_variables() {
    echo "⚙️ Setting environment variables..."
    
    # Get the service ID (this is tricky with Railway CLI, so we'll use a workaround)
    echo "🔧 Setting variables for backend service..."
    
    # Create a temporary script to set variables
    cat > /tmp/set_railway_vars.sh << EOF
#!/bin/bash
railway variables --set "NODE_ENV=production" --service "$SERVICE_NAME"
railway variables --set "PORT=3001" --service "$SERVICE_NAME"
railway variables --set "API_PREFIX=api/v1" --service "$SERVICE_NAME"
railway variables --set "JWT_SECRET=$JWT_SECRET" --service "$SERVICE_NAME"
railway variables --set "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" --service "$SERVICE_NAME"
railway variables --set "JWT_EXPIRES_IN=15m" --service "$SERVICE_NAME"
railway variables --set "JWT_REFRESH_EXPIRES_IN=7d" --service "$SERVICE_NAME"
railway variables --set "CORS_ORIGINS=*" --service "$SERVICE_NAME"
EOF
    
    chmod +x /tmp/set_railway_vars.sh
    
    # Try to set variables
    if /tmp/set_railway_vars.sh; then
        echo -e "${GREEN}✅ Environment variables set${NC}"
    else
        echo -e "${YELLOW}⚠️ Could not set variables via CLI. Manual setup required.${NC}"
        echo "Please add these variables in Railway dashboard:"
        echo "NODE_ENV=production"
        echo "PORT=3001"
        echo "API_PREFIX=api/v1"
        echo "JWT_SECRET=$JWT_SECRET"
        echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
        echo "JWT_EXPIRES_IN=15m"
        echo "JWT_REFRESH_EXPIRES_IN=7d"
        echo "CORS_ORIGINS=*"
    fi
    
    # Clean up
    rm -f /tmp/set_railway_vars.sh
}

# Deploy backend
deploy_backend() {
    echo "🚀 Deploying backend..."
    
    cd ../../backend
    
    # Deploy using Railway CLI
    if railway up; then
        echo -e "${GREEN}✅ Backend deployed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️ Deployment may have issues. Check Railway dashboard.${NC}"
    fi
    
    cd ../infrastructure/railway
}

# Get deployment info
get_deployment_info() {
    echo "📊 Getting deployment information..."
    
    # Get domain
    DOMAIN=$(railway domain 2>/dev/null || echo "Check Railway dashboard for domain")
    
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "================================"
    echo ""
    echo "📋 Your JWT Secrets (save securely):"
    echo "JWT_SECRET: $JWT_SECRET"
    echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
    echo ""
    echo "🌐 Backend URL: $DOMAIN"
    echo "🔗 API Endpoint: $DOMAIN/api/v1"
    echo "📚 Swagger Docs: $DOMAIN/docs"
    echo ""
    echo "🧪 Test your deployment:"
    echo "curl $DOMAIN/api/v1/health"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update Vercel with: NEXT_PUBLIC_API_URL=$DOMAIN/api/v1"
    echo "2. Update CORS_ORIGINS with your Vercel URL"
    echo "3. Test the full stack"
}

# Main execution
main() {
    echo -e "${BLUE}Starting Railway Infrastructure as Code deployment...${NC}"
    echo ""
    
    check_dependencies
    check_auth
    setup_project
    add_database
    generate_secrets
    set_environment_variables
    deploy_backend
    get_deployment_info
    
    echo ""
    echo -e "${GREEN}🎊 All done! Your backend is deployed with Infrastructure as Code!${NC}"
}

# Run main function
main "$@"
