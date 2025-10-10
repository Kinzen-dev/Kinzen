#!/bin/bash

set -e

echo "🚀 Setting up Portfolio Project..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    DOCKER_VERSION=$(docker --version)
    echo "   $DOCKER_VERSION"
else
    echo "⚠️  Docker is not installed. Please install Docker to use containerized development."
fi

# Check if Docker Compose is installed
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed"
    COMPOSE_VERSION=$(docker-compose --version)
    echo "   $COMPOSE_VERSION"
else
    echo "⚠️  Docker Compose is not installed."
fi

echo ""
echo "📦 Installing dependencies..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Generate Prisma client
echo "Generating Prisma client..."
npm run prisma:generate
echo "✅ Prisma client generated"

cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

cd ..

echo ""
echo "📝 Setting up environment files..."

# Backend env
if [ ! -f backend/.env.local ]; then
    cp backend/.env.example backend/.env.local
    echo "✅ Created backend/.env.local"
else
    echo "⚠️  backend/.env.local already exists"
fi

# Frontend env
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
else
    echo "⚠️  frontend/.env.local already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env.local files with your configuration"
echo "  2. Start Docker services: make docker-up"
echo "  3. Run migrations: make db-migrate"
echo "  4. Start development: make dev"
echo ""
echo "Or simply run: make start"
echo ""

