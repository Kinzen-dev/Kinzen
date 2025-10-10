# Railway Deployment Guide

Complete step-by-step guide to deploy your Kinzen backend to Railway.

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Your Kinzen repository pushed to GitHub
- ✅ 5-10 minutes of time

## 🚀 Step-by-Step Deployment

### Step 1: Sign Up / Login to Railway

1. Go to [https://railway.app](https://railway.app)
2. Click **"Login"** or **"Start a New Project"**
3. **Sign in with GitHub** (recommended)
4. Authorize Railway to access your GitHub repositories

---

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. **Select your repository:** `Kinzen-dev/Kinzen` (or your fork)
4. Railway will scan your repository and detect the backend

**Important:** Railway might detect multiple services. Make sure to deploy the **backend** folder.

---

### Step 3: Configure Backend Service

#### 3.1 Set Root Directory

Since we're in a monorepo, Railway needs to know where the backend is:

1. Go to your deployed service
2. Click **"Settings"**
3. Scroll to **"Root Directory"**
4. Set it to: `backend`
5. Click **"Save"**

#### 3.2 Configure Build Settings

Railway should auto-detect the Dockerfile, but verify:

1. In **Settings** → **Build**
2. **Builder:** Docker (should be auto-selected)
3. **Dockerfile Path:** `Dockerfile` (in the backend directory)

---

### Step 4: Add PostgreSQL Database

1. In your project, click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will provision a PostgreSQL database

**Important:** Railway automatically creates a `DATABASE_URL` environment variable and links it to your backend service!

---

### Step 5: Configure Environment Variables

1. Go to your backend service
2. Click **"Variables"** tab
3. Add these variables:

#### Required Variables:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=generate-a-super-secure-random-string-here
JWT_REFRESH_SECRET=generate-another-super-secure-random-string-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
API_PREFIX=api/v1
```

#### CORS Configuration:

**Temporarily use wildcard for testing:**
```env
CORS_ORIGINS=*
```

**Later, update to your actual Vercel URL:**
```env
CORS_ORIGINS=https://kinzen-frontend-3s2c9g2fo-kinzens-projects-29b3d6f7.vercel.app,https://your-custom-domain.com
```

#### 🔐 Generate Secure Secrets

Use one of these methods to generate secure JWT secrets:

**Option 1: OpenSSL (Mac/Linux)**
```bash
openssl rand -base64 32
```

**Option 2: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Online Generator**
- Visit: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys"

#### Optional Variables (for later):

```env
# Redis (if you add Redis service)
REDIS_HOST=your-redis-host.railway.internal
REDIS_PORT=6379

# Logging
LOG_LEVEL=info
```

---

### Step 6: Run Database Migrations

After the backend deploys, you need to run Prisma migrations:

#### Option 1: Using Railway CLI (Recommended)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   cd backend
   railway link
   ```

4. Run migrations:
   ```bash
   railway run npm run prisma:migrate:deploy
   ```

#### Option 2: Add Migration to Dockerfile (Automatic)

Update `backend/Dockerfile` to run migrations on startup:

```dockerfile
# Add before CMD
RUN npx prisma generate

# Change CMD to run migrations first
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
```

Then redeploy.

---

### Step 7: Get Your Backend URL

1. Go to your backend service in Railway
2. Click **"Settings"**
3. Scroll to **"Domains"**
4. You'll see a generated domain like:
   ```
   https://kinzen-backend-production.up.railway.app
   ```

5. **Test it:**
   ```bash
   curl https://kinzen-backend-production.up.railway.app/api/v1/health
   ```

   Should return:
   ```json
   {"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}
   ```

#### Optional: Add Custom Domain

1. In **Settings** → **Domains**
2. Click **"+ Add Domain"**
3. Enter your custom domain: `api.yourdomain.com`
4. Follow DNS setup instructions

---

### Step 8: Update Vercel Environment Variables

Now that your backend is live, update your frontend:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **kinzen-frontend** project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```
   Variable Name: NEXT_PUBLIC_API_URL
   Value: https://kinzen-backend-production.up.railway.app/api/v1
   ```
5. Select **Production**, **Preview**, and **Development** environments
6. Click **"Save"**

---

### Step 9: Redeploy Frontend

Trigger a new deployment to pick up the environment variable:

**Option 1: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**

**Option 2: Via Git Push**
```bash
git commit --allow-empty -m "chore: trigger redeploy for new API URL"
git push origin main
```

**Option 3: Via Vercel CLI**
```bash
cd frontend
vercel --prod
```

---

### Step 10: Update Backend CORS

Once you have your Vercel URL, update CORS in Railway:

1. Go to Railway → Your backend service → **Variables**
2. Update `CORS_ORIGINS`:
   ```
   https://kinzen-frontend-3s2c9g2fo-kinzens-projects-29b3d6f7.vercel.app
   ```
3. Railway will automatically redeploy

---

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] Backend health check responds: `https://your-backend.railway.app/api/v1/health`
- [ ] Swagger docs load: `https://your-backend.railway.app/docs`
- [ ] Database is connected (check health endpoint)
- [ ] Frontend can call backend API
- [ ] CORS is properly configured
- [ ] Authentication works

---

## 🔄 Auto-Deploy from GitHub

Railway automatically deploys when you push to your main branch!

**How it works:**
1. You push code to GitHub (`main` branch)
2. Railway detects the change
3. Railway rebuilds and redeploys your backend
4. Zero downtime deployment! 🎉

**Configure branch:**
1. Go to **Settings** → **Source**
2. Select your branch (default: `main`)

---

## 📊 Monitoring & Logs

### View Logs

1. Go to your backend service
2. Click **"Logs"** tab
3. View real-time logs

### View Metrics

1. Click **"Metrics"** tab
2. See CPU, Memory, Network usage

### Set Up Alerts (Optional)

1. Go to **Settings** → **Alerts**
2. Configure alerts for downtime, high CPU, etc.

---

## 💰 Cost Management

### Free Tier

Railway gives you **$5 of free credit per month**, which is typically enough for:
- 1 backend service
- 1 PostgreSQL database
- Light traffic

### Monitor Usage

1. Go to **Project Settings** → **Usage**
2. Check your current usage
3. Set up billing alerts

### Optimize Costs

- **Use sleep mode** for non-critical services
- **Scale down** when not needed
- **Monitor** resource usage regularly

---

## 🐛 Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
railway logs
```

**Common issues:**
- Missing environment variables → Check Variables tab
- Database connection failed → Verify DATABASE_URL is set
- Port conflict → Railway automatically assigns PORT

### Database Connection Failed

**Verify:**
```bash
railway run npx prisma db pull
```

**If fails:**
- Check DATABASE_URL in Variables
- Ensure Postgres service is running
- Try disconnecting and reconnecting services

### CORS Errors in Frontend

**Update CORS_ORIGINS:**
```env
CORS_ORIGINS=https://your-exact-vercel-url.vercel.app
```

**Note:** Do NOT include trailing slashes!

### Prisma Migration Errors

**Reset database (⚠️ deletes all data):**
```bash
railway run npx prisma migrate reset
```

**Just run migrations:**
```bash
railway run npx prisma migrate deploy
```

---

## 🔒 Security Best Practices

### 1. Secure JWT Secrets

- ✅ Use strong random strings (32+ characters)
- ✅ Never commit secrets to Git
- ✅ Rotate secrets periodically

### 2. Environment Variables

- ✅ Store all secrets in Railway Variables (not in code)
- ✅ Use different secrets for dev/prod
- ✅ Review Railway access permissions

### 3. Database Security

- ✅ Use Railway's private network
- ✅ Don't expose database publicly
- ✅ Regular backups

### 4. CORS Configuration

- ✅ Use specific origins (not `*` in production)
- ✅ Update when changing domains
- ✅ Test thoroughly

---

## 🚀 Advanced: Add Redis Cache

Want to add Redis for caching?

1. In your project, click **"+ New"**
2. Select **"Database"** → **"Redis"**
3. Railway creates Redis instance
4. Add to backend variables:
   ```env
   REDIS_HOST=redis.railway.internal
   REDIS_PORT=6379
   ```
5. Redeploy backend

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [Railway Templates](https://railway.app/templates)
- [Railway Discord Community](https://discord.gg/railway)

---

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app/
- **Railway Discord:** https://discord.gg/railway
- **Project Issues:** Open an issue in your GitHub repo

---

## ✅ Quick Reference Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migrations
railway run npm run prisma:migrate:deploy

# View logs
railway logs

# Open dashboard
railway open

# Run commands in Railway environment
railway run <your-command>
```

---

**🎉 Congratulations! Your backend is now deployed to Railway!**

