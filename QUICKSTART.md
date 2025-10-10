# Quick Start Guide

Get your Portfolio application up and running in minutes!

## 🚀 Super Quick Start (Docker)

If you have Docker installed, this is the fastest way:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/kinzen.git
cd kinzen

# 2. Start everything with Docker
make docker-up

# 3. That's it! 🎉
```

**Access your application:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/v1/docs

## 📦 Standard Quick Start (Without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Steps

```bash
# 1. Clone and enter directory
git clone https://github.com/yourusername/kinzen.git
cd kinzen

# 2. Run setup script
./scripts/setup.sh

# 3. Setup environment variables
# Edit backend/.env.local and frontend/.env.local with your config

# 4. Start PostgreSQL and Redis (locally or via Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kinzen_local postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# 5. Run database migrations
cd backend
npm run prisma:migrate:dev
cd ..

# 6. Start development servers
make dev
```

**Access your application:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🎯 First Steps After Installation

### 1. Register a User

Visit http://localhost:3000/register and create an account:

- Email: `test@example.com`
- Password: `password123` (minimum 8 characters)

### 2. Login

Visit http://localhost:3000/login and login with your credentials.

### 3. Explore the Dashboard

After login, you'll be redirected to the dashboard at http://localhost:3000/dashboard

### 4. Check API Documentation

Visit http://localhost:3001/api/v1/docs to explore the Swagger API documentation.

## 🛠️ Common Commands

```bash
# Development
make dev              # Start development servers
make build           # Build for production
make test            # Run all tests

# Docker
make docker-up       # Start Docker containers
make docker-down     # Stop Docker containers
make docker-logs     # View logs

# Database
make db-migrate      # Run migrations
make db-studio       # Open Prisma Studio (DB GUI)
make db-seed         # Seed database

# Quality
make lint            # Run linters
make format          # Format code
make test-coverage   # Run tests with coverage
```

## 📝 Environment Variables

### Backend (`backend/.env.local`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kinzen_dev"
REDIS_HOST=localhost
JWT_SECRET=your-secret-key
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Backend (port 3001)
lsof -ti:3001 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart <postgres-container-id>
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Restart Redis
docker restart <redis-container-id>
```

### Node Modules Issues

```bash
# Clean install
cd backend && rm -rf node_modules package-lock.json && npm install
cd frontend && rm -rf node_modules package-lock.json && npm install
```

### Prisma Issues

```bash
# Regenerate Prisma client
cd backend
npm run prisma:generate

# Reset database (⚠️ Warning: deletes all data)
npm run prisma:migrate:reset
```

## 📚 Next Steps

1. **Read the Documentation**

   - [Main README](./README.md)
   - [Backend README](./backend/README.md)
   - [Frontend README](./frontend/README.md)
   - [Infrastructure README](./infrastructure/README.md)

2. **Explore the Code**

   - Check out the Clean Architecture structure
   - See how authentication works
   - Learn about the DDD patterns used

3. **Start Building**

   - Add new features
   - Customize the UI
   - Deploy to production

4. **Contribute**
   - Read [CONTRIBUTING.md](./CONTRIBUTING.md)
   - Submit issues or PRs
   - Share your improvements

## 🆘 Need Help?

- **Documentation**: Check the README files
- **Issues**: Open an issue on GitHub
- **Discussions**: Join our community discussions

## 🎉 You're Ready!

Your Portfolio application is now running. Happy coding! 🚀

---

**Quick Reference:**

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api/v1/docs
- Database GUI: `make db-studio`
