#!/bin/bash
set -e

echo "🏗️ Terragrunt Railway Deployment"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if required tools are installed
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform not found. Install with: brew install terraform${NC}"
        exit 1
    fi
    
    if ! command -v terragrunt &> /dev/null; then
        echo -e "${RED}❌ Terragrunt not found. Install with: brew install terragrunt${NC}"
        exit 1
    fi
    
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}⚠️ Railway CLI not found. Installing...${NC}"
        npm install -g @railway/cli
    fi
    
    echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Check Railway authentication
check_railway_auth() {
    echo "🔐 Checking Railway authentication..."
    
    if ! railway whoami &> /dev/null; then
        echo -e "${YELLOW}⚠️ Not logged into Railway. Please login...${NC}"
        railway login
    fi
    
    # Get Railway token
    RAILWAY_TOKEN=$(railway whoami --token)
    if [ -z "$RAILWAY_TOKEN" ]; then
        echo -e "${RED}❌ Could not get Railway token${NC}"
        exit 1
    fi
    
    export RAILWAY_TOKEN
    echo -e "${GREEN}✅ Railway authentication OK${NC}"
}

# Deploy to environment
deploy_environment() {
    local env=$1
    
    echo ""
    echo "🚀 Deploying to ${env} environment..."
    echo "=================================="
    
    cd "environments/${env}"
    
    # Initialize Terragrunt
    echo "📦 Initializing Terragrunt..."
    terragrunt init
    
    # Plan deployment
    echo "📋 Planning deployment..."
    terragrunt plan
    
    # Ask for confirmation
    echo ""
    read -p "Do you want to apply these changes? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    # Apply deployment
    echo "🚀 Applying deployment..."
    terragrunt apply
    
    # Get outputs
    echo ""
    echo "📊 Deployment outputs:"
    echo "====================="
    terragrunt output
    
    cd ../..
}

# Show usage
show_usage() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environments:"
    echo "  production  - Deploy to production"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo ""
    echo "Prerequisites:"
    echo "  1. Railway CLI installed and authenticated"
    echo "  2. Terraform and Terragrunt installed"
    echo "  3. RAILWAY_TOKEN environment variable set"
}

# Main execution
main() {
    local environment=$1
    
    if [ -z "$environment" ]; then
        show_usage
        exit 1
    fi
    
    # Validate environment
    if [ ! -d "environments/${environment}" ]; then
        echo -e "${RED}❌ Environment '${environment}' not found${NC}"
        echo "Available environments:"
        ls -1 environments/
        exit 1
    fi
    
    # Run checks
    check_dependencies
    check_railway_auth
    
    # Deploy
    deploy_environment "$environment"
    
    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check Railway dashboard for deployment status"
    echo "2. Update Vercel with your new backend URL"
    echo "3. Test your API endpoints"
    echo ""
    echo "🔗 Useful commands:"
    echo "  terragrunt output -json backend_url"
    echo "  terragrunt destroy  # To destroy resources"
}

# Run main function
main "$@"
