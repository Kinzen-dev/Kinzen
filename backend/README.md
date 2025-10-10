# Kinzen Backend API

A modern, scalable backend powering the Kinzen personal website - built with **NestJS**, **Clean Architecture**, and **Domain-Driven Design (DDD)**.

## Features Powered by This Backend

- 💼 Professional portfolio management
- 🚗 Car collection with 3D model metadata
- 📈 US stocks tracking and analytics
- ⚽ Manchester United stats and content
- 📝 Personal blog and content management
- 👤 User authentication and profiles

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── config/                 # Configuration files
├── modules/                # Feature modules (Bounded Contexts)
│   ├── users/
│   │   ├── domain/        # Business logic & entities
│   │   ├── application/   # Use cases (commands & queries)
│   │   ├── infrastructure/# Database, external services
│   │   └── presentation/  # Controllers & DTOs
│   ├── auth/
│   └── health/
└── shared/                 # Cross-cutting concerns
    ├── guards/
    ├── interceptors/
    ├── filters/
    ├── decorators/
    └── infrastructure/
```

## 🚀 Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## 📦 Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

## 🛠️ Environment Setup

Copy the appropriate environment file:

```bash
# For local development
cp .env.example .env.local

# For docker development
cp .env.example .env.development
```

## 🗄️ Database Setup

```bash
# Run migrations (development)
npm run prisma:migrate:dev

# Run migrations (production)
npm run prisma:migrate:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed database (optional)
npm run seed
```

## 🏃 Running the Application

### Local Development
```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### With Docker
```bash
# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f backend
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📚 API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:3001/api/v1/docs
- **Health Check**: http://localhost:3001/api/v1/health

## 🔐 Authentication

The API uses JWT-based authentication:

1. Register: `POST /api/v1/users`
2. Login: `POST /api/v1/auth/login`
3. Use the access token in Authorization header: `Bearer <token>`
4. Refresh token: `POST /api/v1/auth/refresh`

## 📋 Available Scripts

```bash
npm run start:dev         # Start development server
npm run start:prod        # Start production server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run test             # Run unit tests
npm run test:e2e         # Run e2e tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate:dev   # Run migrations (dev)
npm run prisma:studio    # Open Prisma Studio
```

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRATION` | JWT expiration time | `1h` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

## 🏛️ Design Patterns

- **Clean Architecture**: Separation of concerns with clear boundaries
- **Domain-Driven Design**: Bounded contexts and domain entities
- **CQRS**: Command Query Responsibility Segregation
- **Repository Pattern**: Abstraction over data access
- **Dependency Injection**: Loose coupling between components

## 📈 Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run all checks
npm run lint && npm run test && npm run test:e2e
```

## 🚢 Deployment

### Docker
```bash
docker build -t kinzen-backend .
docker run -p 3001:3001 kinzen-backend
```

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure production database
- [ ] Set up Redis for caching
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry, Datadog)
- [ ] Configure CI/CD pipeline
- [ ] Set up database backups
- [ ] Enable SSL/TLS
- [ ] Configure logging

## 📄 License

MIT

# Pre-commit hooks setup completed
