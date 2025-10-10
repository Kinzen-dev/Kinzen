# Kinzen - Personal Website & Digital Hub

A comprehensive personal website showcasing my work, interests, and passions - from professional portfolio to car collections, stocks tracking, and Manchester United fandom. Built with production-ready, scalable architecture and modern best practices.

## 🚀 Tech Stack

### Backend

- **Framework**: NestJS 10 with TypeScript
- **Architecture**: Clean Architecture + Domain-Driven Design (DDD)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + Testing Library

### Infrastructure

- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes
- **IaC**: Terraform (AWS)
- **CI/CD**: GitHub Actions
- **Reverse Proxy**: Nginx
- **Cloud**: AWS (ECS, RDS, ElastiCache, S3, CloudFront)

## 🎯 What's Inside Kinzen?

This isn't just a portfolio - it's my personal digital universe:

- 💼 **Professional Portfolio** - My work, projects, and achievements
- 🚗 **Car Collection 3D Gallery** - Interactive 3D models of cars I own
- 📈 **US Stocks Tracker** - Real-time tracking and analysis of my investments
- ⚽ **Manchester United Hub** - Match stats, news, and my football journey
- 📝 **Personal Blog** - Life updates, thoughts, and experiences
- 🎨 **Creative Showcase** - Art, photography, and creative projects

## 📁 Project Structure

```
kinzen/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── modules/        # Feature modules (DDD)
│   │   ├── shared/         # Shared utilities
│   │   └── config/         # Configuration
│   ├── prisma/             # Database schema & migrations
│   └── test/               # Tests
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── features/      # Feature modules
│   │   └── shared/        # Shared components & utilities
│   └── public/            # Static assets
└── infrastructure/         # Infrastructure as Code
    ├── docker-compose.*.yml
    ├── kubernetes/
    ├── terraform/
    └── nginx/
```

## 🏗️ Architecture

### Clean Architecture (Backend)

```
┌─────────────────────────────────────┐
│     Presentation Layer (API)        │  ← Controllers, DTOs
├─────────────────────────────────────┤
│     Application Layer (Use Cases)   │  ← Business Logic
├─────────────────────────────────────┤
│     Domain Layer (Core)             │  ← Entities, Interfaces
├─────────────────────────────────────┤
│     Infrastructure Layer            │  ← Database, External APIs
└─────────────────────────────────────┘
```

### Domain-Driven Design

- **Bounded Contexts**: Users, Auth, etc.
- **Aggregates**: Consistency boundaries
- **Repositories**: Data access abstraction
- **Domain Events**: Cross-context communication

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+ (if running locally)
- Redis 7+ (if running locally)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/kinzen.git
cd kinzen
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env.local
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

Backend will run on http://localhost:3001

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend will run on http://localhost:3000

### 4. Using Docker Compose (Recommended)

```bash
# From project root
cd infrastructure
docker-compose -f docker-compose.local.yml up -d
```

All services will be available:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api/v1/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📖 Documentation

### Quick Start Guides
- [Getting Started](./GETTING_STARTED_KINZEN.md) - Complete setup guide
- [Quick Start](./QUICKSTART.md) - Fast track for experienced developers
- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md) - How to test locally
- [Testing Steps](./TESTING_STEPS.md) - Testing checklist

### Component Documentation
- [Backend README](./backend/README.md) - Backend architecture and setup
- [Frontend README](./frontend/README.md) - Frontend structure and components
- [Infrastructure README](./infrastructure/README.md) - Infrastructure setup and deployment

### CI/CD & Deployment
- [CI/CD Pipeline Guide](./CI_CD_PIPELINE_GUIDE.md) - Complete CI/CD setup and configuration
- [Pipeline Status](./PIPELINE_STATUS.md) - Current pipeline status and explanation

### Features & Architecture
- [Features Roadmap](./FEATURES_ROADMAP.md) - Upcoming features and timeline
- [Architecture for Features](./ARCHITECTURE_FOR_FEATURES.md) - How to build new features
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

## 🧪 Testing

### Backend

```bash
cd backend
npm run test              # Unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # Coverage
```

### Frontend

```bash
cd frontend
npm run test             # Unit tests
npm run test:ui          # Test UI
npm run test:coverage    # Coverage
```

## 🐳 Docker

### Build Images

```bash
# Backend
docker build -t portfolio-backend ./backend

# Frontend
docker build -t portfolio-frontend ./frontend
```

### Run with Docker Compose

```bash
# Local development
docker-compose -f infrastructure/docker-compose.local.yml up

# Development environment
docker-compose -f infrastructure/docker-compose.dev.yml up

# Production
docker-compose -f infrastructure/docker-compose.prod.yml up
```

## ☸️ Kubernetes Deployment

```bash
# Apply all configurations
kubectl apply -f infrastructure/kubernetes/

# Check deployment
kubectl get pods -n kinzen
kubectl get services -n kinzen
kubectl get ingress -n kinzen
```

## ☁️ AWS Deployment (Terraform)

```bash
cd infrastructure/terraform

# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply
```

## 🔐 Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/kinzen
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🌍 Environments

| Environment     | Branch    | Auto-Deploy          | URL                    |
| --------------- | --------- | -------------------- | ---------------------- |
| **Local**       | -         | No                   | localhost              |
| **Development** | `develop` | Yes                  | dev.yourdomain.com     |
| **Staging**     | `develop` | Yes                  | staging.yourdomain.com |
| **Production**  | `main`    | Yes (after approval) | yourdomain.com         |

## 📊 Features

- ✅ Clean Architecture & DDD
- ✅ Type-safe with TypeScript
- ✅ JWT Authentication
- ✅ API Documentation (Swagger)
- ✅ Database Migrations
- ✅ Caching with Redis
- ✅ Rate Limiting
- ✅ Input Validation
- ✅ Error Handling
- ✅ Logging
- ✅ Testing (Unit, Integration, E2E)
- ✅ Docker Support
- ✅ Kubernetes Ready
- ✅ CI/CD Pipelines
- ✅ Infrastructure as Code
- ✅ Multi-environment Support
- ✅ Security Best Practices
- ✅ Monitoring & Health Checks
- ✅ Horizontal Scaling
- ✅ Load Balancing

## 🔒 Security

- Helmet for HTTP headers
- CORS configuration
- Rate limiting
- Input validation & sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens
- Secure password hashing (bcrypt)
- JWT with refresh tokens
- Secrets management

## 📈 Performance

- Redis caching
- Database connection pooling
- Query optimization
- CDN (CloudFront)
- Image optimization
- Gzip compression
- Lazy loading
- Code splitting

## 🔄 CI/CD

GitHub Actions workflows provide automated testing and deployment:

### Current Status
- **Backend CI**: ✅ Lint, Type Check, Unit Tests, E2E Tests, Coverage
- **Frontend CI**: ✅ Lint, Type Check, Build
- **Build Jobs**: 🔄 Commented out (requires Docker Hub credentials)
- **Deploy Jobs**: 🔄 Commented out (requires Docker Hub + Vercel credentials)

### Full Pipeline (When Enabled)
- Automatic builds on push to `main` and `develop`
- Docker image building and pushing to Docker Hub
- Automatic deployments to staging (from `develop` branch)
- Automatic deployments to production (from `main` branch)
- Code coverage reporting with Codecov

**📚 See [CI/CD Pipeline Guide](./CI_CD_PIPELINE_GUIDE.md) for complete setup instructions**  
**📊 See [Pipeline Status](./PIPELINE_STATUS.md) for visual overview**

## 🛠️ Development Workflow

1. Create feature branch from `develop`
2. Make changes
3. Write tests
4. Commit with conventional commits
5. Push and create PR
6. CI runs tests
7. Code review
8. Merge to `develop` (auto-deploy to staging)
9. Test on staging
10. Merge to `main` (deploy to production)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Best Practices

- Follow Clean Architecture principles
- Write tests for new features
- Use TypeScript strict mode
- Follow ESLint rules
- Write meaningful commit messages
- Document complex logic
- Keep functions small and focused
- Use dependency injection
- Handle errors properly
- Log important events

## 📚 Learn More

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 📄 License

MIT

## 👤 Author

Your Name - [@yourhandle](https://twitter.com/yourhandle)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Vercel for Next.js
- The open-source community

---

**Built with ❤️ using modern best practices and clean architecture**
