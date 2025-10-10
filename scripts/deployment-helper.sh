#!/bin/bash

# Kinzen Deployment Helper Script
# This script helps you set up deployment credentials and test locally

set -e

echo "🚀 Kinzen Deployment Helper"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Docker is installed
check_docker() {
    echo "Checking Docker installation..."
    if command -v docker &> /dev/null; then
        print_success "Docker is installed: $(docker --version)"
    else
        print_error "Docker is not installed. Please install Docker first:"
        echo "   Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# Test Docker Hub login
test_docker_hub() {
    echo ""
    echo "📦 Testing Docker Hub Access"
    echo "============================"
    echo ""
    
    read -p "Enter your Docker Hub username: " DOCKER_USERNAME
    
    echo ""
    print_info "Now you'll be prompted for your Docker Hub password/token"
    print_info "Use the ACCESS TOKEN you created, not your password!"
    echo ""
    
    if docker login -u "$DOCKER_USERNAME"; then
        print_success "Docker Hub login successful!"
        
        echo ""
        echo "Testing Docker build..."
        
        # Test backend build
        if docker build -t "$DOCKER_USERNAME/kinzen-backend:test" ./backend; then
            print_success "Backend Docker image built successfully!"
            
            echo ""
            read -p "Push test image to Docker Hub? (y/n): " PUSH_CHOICE
            
            if [ "$PUSH_CHOICE" = "y" ]; then
                if docker push "$DOCKER_USERNAME/kinzen-backend:test"; then
                    print_success "Test image pushed to Docker Hub!"
                    print_info "Check it at: https://hub.docker.com/r/$DOCKER_USERNAME/kinzen-backend"
                else
                    print_error "Failed to push image"
                fi
            fi
        else
            print_error "Failed to build Docker image"
        fi
    else
        print_error "Docker Hub login failed"
        exit 1
    fi
}

# Check if Vercel CLI is installed
check_vercel() {
    echo ""
    echo "🌐 Checking Vercel CLI"
    echo "===================="
    echo ""
    
    if command -v vercel &> /dev/null; then
        print_success "Vercel CLI is installed: $(vercel --version)"
    else
        print_info "Vercel CLI is not installed"
        read -p "Install Vercel CLI now? (y/n): " INSTALL_VERCEL
        
        if [ "$INSTALL_VERCEL" = "y" ]; then
            npm install -g vercel
            print_success "Vercel CLI installed!"
        else
            print_info "You can install it later with: npm install -g vercel"
        fi
    fi
}

# Test Vercel deployment
test_vercel() {
    echo ""
    echo "🌐 Testing Vercel Deployment"
    echo "============================"
    echo ""
    
    if command -v vercel &> /dev/null; then
        print_info "Logging into Vercel..."
        vercel login
        
        echo ""
        print_info "Linking project to Vercel..."
        print_info "When prompted:"
        print_info "  - Set up and deploy? N (we'll do this via CI/CD)"
        print_info "  - Link to existing project? N"
        print_info "  - Project name? kinzen-frontend"
        echo ""
        
        cd frontend
        vercel link
        
        if [ -f ".vercel/project.json" ]; then
            print_success "Project linked successfully!"
            echo ""
            echo "Your Vercel credentials:"
            cat .vercel/project.json
            echo ""
            print_info "Save these values for GitHub secrets:"
            print_info "  VERCEL_ORG_ID = $(cat .vercel/project.json | grep orgId | cut -d'"' -f4)"
            print_info "  VERCEL_PROJECT_ID = $(cat .vercel/project.json | grep projectId | cut -d'"' -f4)"
        fi
        
        cd ..
    else
        print_error "Vercel CLI not installed"
    fi
}

# Display GitHub secrets format
show_github_secrets() {
    echo ""
    echo "🔑 GitHub Secrets Configuration"
    echo "==============================="
    echo ""
    
    print_info "Go to: https://github.com/Kinzen-dev/Kinzen/settings/secrets/actions"
    echo ""
    echo "Add these 5 secrets:"
    echo ""
    echo "1. DOCKER_USERNAME"
    echo "   Value: <your-dockerhub-username>"
    echo ""
    echo "2. DOCKER_PASSWORD"
    echo "   Value: <your-dockerhub-access-token>"
    echo ""
    echo "3. VERCEL_TOKEN"
    echo "   Value: <get from https://vercel.com/account/tokens>"
    echo ""
    echo "4. VERCEL_ORG_ID"
    echo "   Value: <from .vercel/project.json>"
    echo ""
    echo "5. VERCEL_PROJECT_ID"
    echo "   Value: <from .vercel/project.json>"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "1) Check Docker installation"
    echo "2) Test Docker Hub login and build"
    echo "3) Check/Install Vercel CLI"
    echo "4) Test Vercel deployment"
    echo "5) Show GitHub secrets format"
    echo "6) Run all checks"
    echo "0) Exit"
    echo ""
    read -p "Choose an option: " CHOICE
    
    case $CHOICE in
        1) check_docker ;;
        2) test_docker_hub ;;
        3) check_vercel ;;
        4) test_vercel ;;
        5) show_github_secrets ;;
        6) 
            check_docker
            check_vercel
            show_github_secrets
            ;;
        0) exit 0 ;;
        *) print_error "Invalid option" ;;
    esac
    
    show_menu
}

# Run
echo "This helper will guide you through deployment setup."
echo ""
show_menu

