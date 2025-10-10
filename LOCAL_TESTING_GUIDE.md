# 🚀 Kinzen - Local Testing Guide

Complete step-by-step guide to run and test Kinzen on your local machine.

## Prerequisites

Before starting, ensure you have:

- ✅ **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- ✅ **Docker** & **Docker Compose** - [Download](https://www.docker.com/products/docker-desktop)
- ✅ **Git** - [Download](https://git-scm.com/)

Check your installations:

```bash
node -v    # Should show v18+
docker -v  # Should show Docker version
docker compose version  # Should show Docker Compose version
```

---

## 🎯 Option 1: Quick Start with Docker (Recommended)

This is the **easiest way** to test everything. Docker handles all dependencies automatically.

### Step 1: Start Docker Services

```bash
# Make sure you're in the project root
cd /Users/triok.t/kinzen/portfolio

# Start all services (PostgreSQL, Redis, Backend, Frontend)
make docker-up
```

This will:

- Start PostgreSQL on `localhost:5432`
- Start Redis on `localhost:6379`
- Build and start Backend on `localhost:3001`
- Build and start Frontend on `localhost:3000`

### Step 2: Run Database Migrations

```bash
# Wait 30 seconds for containers to be ready, then run migrations
sleep 30

# Run migrations inside the backend container
docker exec -it kinzen-backend-local npm run prisma:migrate:dev
```

When prompted for migration name, enter: `init`

### Step 3: Access the Application

Open your browser:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/v1
- **API Documentation (Swagger):** http://localhost:3001/api/v1/docs
- **Health Check:** http://localhost:3001/api/v1/health

### Step 4: Test the Application

#### 1. Register a New User

- Go to http://localhost:3000/register
- Fill in the form:
  - Email: `test@kinzen.com`
  - Password: `Test123456!`
  - First Name: `Test`
  - Last Name: `User`
- Click "Register"

#### 2. Login

- Go to http://localhost:3000/login
- Enter your credentials
- You should be redirected to the dashboard

#### 3. Test API Endpoints (Swagger)

- Go to http://localhost:3001/api/v1/docs
- Try the endpoints:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /users` (requires authentication)

### Step 5: View Logs (Optional)

```bash
# View all logs
make docker-logs

# View specific service logs
docker logs -f kinzen-backend-local
docker logs -f kinzen-frontend-local
docker logs -f kinzen-postgres-local
```

### Step 6: Stop Services

```bash
# Stop all containers
make docker-down

# Or completely remove everything (including volumes)
cd infrastructure
docker compose -f docker-compose.local.yml down -v
```

---

## 🎯 Option 2: Local Development (Without Docker)

Use this if you want to run services natively on your machine (useful for debugging).

### Step 1: Install Dependencies

```bash
# Install all dependencies
make install

# Or manually:
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Start PostgreSQL & Redis

You need PostgreSQL and Redis running. You can use Docker for just the databases:

```bash
# Start only databases
docker run -d --name kinzen-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kinzen_local \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d --name kinzen-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Step 3: Set Up Environment Files

```bash
# Backend
cp backend/.env.example backend/.env.local

# Frontend
cp frontend/.env.example frontend/.env.local
```

### Step 4: Generate Prisma Client & Run Migrations

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:dev
# When prompted, name it: init

cd ..
```

### Step 5: Start Development Servers

```bash
# Option A: Start both servers together
make dev

# Option B: Start separately in different terminals
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Step 6: Access & Test

Same as Docker Option:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/v1
- **Swagger Docs:** http://localhost:3001/api/v1/docs

---

## 🔧 Useful Commands

### Database Management

```bash
# Open Prisma Studio (Database GUI)
make db-studio
# Or: cd backend && npm run prisma:studio

# Run migrations
make db-migrate

# Reset database (careful!)
cd backend && npx prisma migrate reset
```

### Testing

```bash
# Run backend tests
cd backend && npm test

# Run tests with coverage
cd backend && npm run test:cov

# Run E2E tests
cd backend && npm run test:e2e
```

### Code Quality

```bash
# Run linters
make lint

# Auto-fix lint issues
make lint-fix

# Format code
make format
```

---

## 🐛 Troubleshooting

### Problem: Port already in use

```bash
# Find what's using the port
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL

# Kill the process
kill -9 <PID>
```

### Problem: Database connection error

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart kinzen-postgres-local

# Check logs
docker logs kinzen-postgres-local
```

### Problem: Frontend can't connect to backend

1. Check if backend is running: http://localhost:3001/api/v1/health
2. Check environment variables in `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   ```
3. Restart frontend server

### Problem: Prisma errors

```bash
# Regenerate Prisma client
cd backend
npm run prisma:generate

# Reset and recreate database
npx prisma migrate reset
npm run prisma:migrate:dev
```

### Problem: Docker containers won't start

```bash
# Clean everything
make docker-down
docker system prune -a --volumes

# Rebuild and restart
make docker-up
```

---

## 📊 Database Access

### Using Prisma Studio (GUI)

```bash
make db-studio
# Opens at http://localhost:5555
```

### Using psql (CLI)

```bash
# Connect to database
docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local

# Useful commands:
\dt          # List tables
\d users     # Describe users table
SELECT * FROM users;
\q           # Quit
```

### Using a Database Client

- **Host:** localhost
- **Port:** 5432
- **Database:** kinzen_local
- **User:** postgres
- **Password:** postgres

Recommended clients:

- [pgAdmin](https://www.pgadmin.org/)
- [DBeaver](https://dbeaver.io/)
- [TablePlus](https://tableplus.com/)

---

## 🎯 What to Test

### ✅ Authentication Flow

1. Register a new user → Should succeed
2. Login with correct credentials → Should get JWT token
3. Login with wrong password → Should fail with error
4. Access protected route without token → Should get 401
5. Access protected route with token → Should succeed

### ✅ API Endpoints

Test via Swagger UI (http://localhost:3001/api/v1/docs):

1. **POST /auth/register** - Create user
2. **POST /auth/login** - Get JWT token
3. **POST /auth/refresh** - Refresh token
4. **GET /users** - List users (requires auth)
5. **GET /users/:id** - Get user by ID (requires auth)
6. **GET /health** - Health check

### ✅ Database

1. Check that users are created in database
2. Verify refresh tokens are stored
3. Check that profiles are created

### ✅ Frontend Pages

1. **/** - Landing page with Kinzen branding
2. **/register** - Registration form
3. **/login** - Login form
4. **/dashboard** - Protected dashboard (requires login)

---

## 🚀 Next Steps After Testing

Once everything works:

1. **Build Your First Feature** - Professional Portfolio Module

   ```bash
   # Follow ARCHITECTURE_FOR_FEATURES.md
   ```

2. **Customize**

   - Update branding/colors in `frontend/src/app/globals.css`
   - Add your content to landing page
   - Customize email/user fields

3. **Deploy** (when ready)
   - Development: `docker compose -f infrastructure/docker-compose.dev.yml up`
   - Production: See `infrastructure/README.md`

---

## 📝 Quick Reference

### Essential Commands

```bash
make docker-up        # Start everything with Docker
make docker-down      # Stop Docker services
make docker-logs      # View logs
make dev             # Start dev servers (no Docker)
make db-studio       # Open database GUI
make lint            # Check code quality
make test            # Run tests
```

### URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/v1/docs
- Prisma Studio: http://localhost:5555

### Database

- Host: localhost:5432
- Database: kinzen_local
- User: postgres
- Password: postgres

---

**Happy Testing! 🎉**

If you encounter any issues, check the troubleshooting section or the logs.
