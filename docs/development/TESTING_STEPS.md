# 🧪 Testing Steps for Kinzen

Your Kinzen application is ready to test! Follow these simple steps:

## ✅ Current Status

- ✅ Backend code compiled successfully
- ✅ Frontend code compiled successfully
- ✅ Docker images built successfully
- ✅ PostgreSQL running on `localhost:5432`
- ✅ Redis running on `localhost:6379`
- ✅ Database migrations completed
- ✅ Environment files created

## 🚀 How to Test

### Option 1: Run Everything Manually (Recommended for Testing)

This way you can see all the logs and debug easily.

**Terminal 1 - Backend:**

```bash
cd /Users/triok.t/kinzen/portfolio/backend
npm run start:dev
```

**Terminal 2 - Frontend:**

```bash
cd /Users/triok.t/kinzen/portfolio/frontend
npm run dev
```

### URLs to Access

Once both servers are running:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/v1
- **Swagger Docs:** http://localhost:3001/api/v1/docs
- **Health Check:** http://localhost:3001/api/v1/health

## 🎯 What to Test

### 1. Backend Health Check

```bash
curl http://localhost:3001/api/v1/health
```

Should return:

```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected",
  "redis": "connected"
}
```

### 2. Register a New User

**Via Swagger UI (Easy Way):**

1. Go to http://localhost:3001/api/v1/docs
2. Find `POST /users` endpoint
3. Click "Try it out"
4. Enter:
   ```json
   {
     "email": "test@kinzen.com",
     "password": "Test123456!",
     "firstName": "Test",
     "lastName": "User"
   }
   ```
5. Click "Execute"

**Via Frontend:**

1. Go to http://localhost:3000/register
2. Fill in the form
3. Click "Register"

### 3. Login

**Via Swagger:**

1. Use `POST /auth/login` endpoint
2. Enter your credentials
3. Copy the `accessToken`
4. Click "Authorize" button at the top
5. Enter: `Bearer YOUR_ACCESS_TOKEN`

**Via Frontend:**

1. Go to http://localhost:3000/login
2. Enter your email and password
3. Should redirect to `/dashboard`

### 4. Test Protected Endpoints

Once authorized in Swagger:

- `GET /users` - List all users
- `GET /users/{id}` - Get specific user

## 🛠️ Troubleshooting

### Backend Won't Start

```bash
# Check if port 3001 is in use
lsof -i :3001

# If something is using it, kill it
kill -9 <PID>

# Make sure databases are running
docker ps | grep kinzen
```

### Frontend Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# If something is using it, kill it
kill -9 <PID>
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL if needed
docker restart kinzen-postgres-local
```

### "Cannot find module" Errors

```bash
# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

## 🎨 Test the Features

### Landing Page

- Go to http://localhost:3000
- Should see "Welcome to Kinzen"
- Clean, modern UI with Tailwind CSS

### Authentication Flow

1. Register → Should succeed with success message
2. Login → Should get JWT token and redirect to dashboard
3. Dashboard → Should be protected (redirects to login if not authenticated)
4. Logout → Should clear tokens

### API Documentation

- Go to http://localhost:3001/api/v1/docs
- Swagger UI with all endpoints
- Try executing endpoints directly from the UI

## 📊 Check the Database

### Using Prisma Studio (GUI)

```bash
cd backend
npx prisma studio
```

Opens at http://localhost:5555

### Using psql (CLI)

```bash
docker exec -it kinzen-postgres-local psql -U postgres -d kinzen_local

# Once inside:
\dt              # List tables
SELECT * FROM users;
SELECT * FROM refresh_tokens;
\q               # Quit
```

## 🎉 Success Criteria

You've successfully tested when:

- ✅ Backend starts without errors
- ✅ Frontend starts and loads
- ✅ Health check returns "ok"
- ✅ You can register a user
- ✅ You can login and get a token
- ✅ Dashboard loads when authenticated
- ✅ Protected routes require authentication
- ✅ Swagger UI works
- ✅ Database contains your test user

## 🚦 Next Steps After Testing

Once everything works:

1. **Stop the servers:** `Ctrl+C` in each terminal

2. **Stop the databases:**

   ```bash
   docker compose -f infrastructure/docker-compose.local.yml down
   ```

3. **Build your first feature** (Professional Portfolio module):
   - See `ARCHITECTURE_FOR_FEATURES.md`
   - Follow the Clean Architecture pattern in `backend/src/modules/users`

4. **Customize the branding:**
   - Update colors in `frontend/src/app/globals.css`
   - Modify landing page in `frontend/src/app/page.tsx`

## 📝 Notes

- The databases (PostgreSQL & Redis) are running in Docker
- Backend and Frontend are running directly on your machine
- All data persists in Docker volumes
- Hot reload is enabled for both backend and frontend

---

**Happy Testing! 🎊**

If you encounter any issues, check the troubleshooting section or examine the console logs.
