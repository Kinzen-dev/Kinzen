.PHONY: help install dev build test clean docker-up docker-down deploy-k8s start-all services-up stop-all

# Default target
help:
	@echo "Portfolio - Available Commands"
	@echo "================================"
	@echo "  make install        - Install all dependencies"
	@echo "  make dev            - Start development servers"
	@echo "  make build          - Build all applications"
	@echo "  make test           - Run all tests"
	@echo "  make lint           - Run linters"
	@echo "  make format         - Format code"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make docker-up      - Start Docker Compose (local)"
	@echo "  make docker-down    - Stop Docker Compose"
	@echo "  make docker-logs    - View Docker logs"
	@echo "  make start-all      - Start all services with helpful info"
	@echo "  make services-up    - Alias for start-all"
	@echo "  make stop-all       - Stop all services"
	@echo "  make deploy-k8s     - Deploy to Kubernetes"
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make db-seed        - Seed database"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	cd backend && npm install
	cd frontend && npm install

# Development
dev:
	@echo "🚀 Starting development servers..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

# Build
build:
	@echo "🔨 Building applications..."
	cd backend && npm run build
	cd frontend && npm run build

# Testing
test:
	@echo "🧪 Running tests..."
	cd backend && npm run test
	cd frontend && npm run test

test-e2e:
	@echo "🧪 Running E2E tests..."
	cd backend && npm run test:e2e

test-coverage:
	@echo "📊 Running tests with coverage..."
	cd backend && npm run test:cov
	cd frontend && npm run test:coverage

# Linting
lint:
	@echo "🔍 Running linters..."
	cd backend && npm run lint
	cd frontend && npm run lint

lint-fix:
	@echo "🔧 Fixing lint issues..."
	cd backend && npm run lint -- --fix
	cd frontend && npm run lint -- --fix

# Formatting
format:
	@echo "✨ Formatting code..."
	cd backend && npm run format
	cd frontend && npm run format

# Clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/.next frontend/node_modules
	rm -rf frontend/out

# Docker
docker-build:
	@echo "🐳 Building Docker images..."
	docker build -t portfolio-backend ./backend
	docker build -t portfolio-frontend ./frontend

docker-up:
	@echo "🐳 Starting Docker Compose (local)..."
	cd infrastructure && docker-compose -f docker-compose.local.yml up -d

docker-down:
	@echo "🐳 Stopping Docker Compose..."
	cd infrastructure && docker-compose -f docker-compose.local.yml down

docker-logs:
	@echo "📋 Viewing Docker logs..."
	cd infrastructure && docker-compose -f docker-compose.local.yml logs -f

docker-restart:
	@make docker-down
	@make docker-up

# Database
db-generate:
	@echo "🗄️ Generating Prisma client..."
	cd backend && npm run prisma:generate

db-migrate:
	@echo "🗄️ Running database migrations..."
	cd backend && npm run prisma:migrate:dev

db-migrate-prod:
	@echo "🗄️ Running database migrations (production)..."
	cd backend && npm run prisma:migrate:deploy

db-studio:
	@echo "🗄️ Opening Prisma Studio..."
	cd backend && npm run prisma:studio

db-seed:
	@echo "🌱 Seeding database..."
	cd backend && npm run seed

# Kubernetes
deploy-k8s:
	@echo "☸️ Deploying to Kubernetes..."
	kubectl apply -f infrastructure/kubernetes/namespace.yml
	kubectl apply -f infrastructure/kubernetes/configmap.yml
	kubectl apply -f infrastructure/kubernetes/secrets.yml
	kubectl apply -f infrastructure/kubernetes/backend-deployment.yml
	kubectl apply -f infrastructure/kubernetes/frontend-deployment.yml
	kubectl apply -f infrastructure/kubernetes/ingress.yml

k8s-status:
	@echo "☸️ Checking Kubernetes status..."
	kubectl get all -n portfolio

k8s-logs-backend:
	@echo "📋 Viewing backend logs..."
	kubectl logs -f deployment/portfolio-backend -n portfolio

k8s-logs-frontend:
	@echo "📋 Viewing frontend logs..."
	kubectl logs -f deployment/portfolio-frontend -n portfolio

# Terraform
tf-init:
	@echo "☁️ Initializing Terraform..."
	cd infrastructure/terraform && terraform init

tf-plan:
	@echo "☁️ Planning Terraform changes..."
	cd infrastructure/terraform && terraform plan

tf-apply:
	@echo "☁️ Applying Terraform changes..."
	cd infrastructure/terraform && terraform apply

tf-destroy:
	@echo "☁️ Destroying Terraform infrastructure..."
	cd infrastructure/terraform && terraform destroy

# Git hooks
setup-hooks:
	@echo "🪝 Setting up Git hooks..."
	git config core.hooksPath .githooks

# Security
security-check:
	@echo "🔒 Running security checks..."
	cd backend && npm audit
	cd frontend && npm audit

security-fix:
	@echo "🔒 Fixing security vulnerabilities..."
	cd backend && npm audit fix
	cd frontend && npm audit fix

# All-in-one commands
setup: install db-generate setup-hooks
	@echo "✅ Setup complete!"

start: docker-up
	@echo "✅ Application started!"

start-all: docker-up
	@echo "🚀 All services started successfully!"
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔧 Backend API: http://localhost:3001/api/v1"
	@echo "📚 API Docs: http://localhost:3001/docs"
	@echo "💚 Health Check: http://localhost:3001/api/v1/health"

services-up: start-all

stop: docker-down
	@echo "✅ Application stopped!"

stop-all: docker-down
	@echo "🛑 All services stopped!"

restart: stop start
	@echo "✅ Application restarted!"

check: lint test
	@echo "✅ All checks passed!"

# Railway Infrastructure as Code
railway-deploy:
	@echo "🚂 Deploying to Railway with Infrastructure as Code..."
	cd infrastructure/railway && ./railway-iac.sh

railway-deploy-api:
	@echo "🚂 Deploying to Railway with Node.js API..."
	cd infrastructure/railway && node railway-api-deploy.js

railway-setup:
	@echo "🚂 Complete Railway setup with Infrastructure as Code..."
	node railway-complete-setup.js

railway-status:
	@echo "📊 Checking Railway deployment status..."
	railway status

railway-logs:
	@echo "📋 Viewing Railway logs..."
	railway logs

railway-domain:
	@echo "🌐 Getting Railway domain..."
	railway domain

