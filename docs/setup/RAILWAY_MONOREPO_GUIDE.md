# Railway Monorepo Deployment Guide

Railway works great with monorepos! Here's exactly how to deploy your Kinzen backend.

## 🎯 The Issue

Railway deploys from the repository root by default, but our backend is in `/backend` directory.

## ✅ The Solution

Railway has a **"Root Directory"** setting that tells it where your app lives!

---

## 🚀 Step-by-Step Deployment

### **Step 1: Fix GitHub Repository Access**

If Railway says "No repositories found":

1. Go to Railway → Profile → **Account Settings**
2. Scroll to **"Integrations"**
3. Click **"Configure GitHub App"**
4. In GitHub, select **"Only select repositories"**
5. **Add `Kinzen-dev/Kinzen`** to the list
6. Click **"Save"**
7. Go back to Railway and refresh

---

### **Step 2: Create New Project**

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. **Search for "Kinzen"** or scroll to find it
4. Click on your **Kinzen** repository
5. Railway will start deploying from the root (this is expected!)

---

### **Step 3: Configure Root Directory** ⚙️

**This is the key step for monorepos!**

1. Railway creates a service (might be called "kinzen-production" or similar)
2. Click on the service card
3. Go to **"Settings"** tab
4. Scroll down to **"Root Directory"**
5. Enter: `backend`
6. Click **"Update"** or it saves automatically
7. Railway will **redeploy** automatically

**What this does:**
- Railway now treats `/backend` as the root
- It looks for `Dockerfile` in `/backend/Dockerfile`
- All paths are relative to `/backend`

---

### **Step 4: Verify Docker Detection**

Still in Settings:

1. Scroll to **"Build"** section
2. Verify **"Builder"** says: **`DOCKERFILE`**
3. If it says `NIXPACKS`, change it to `DOCKERFILE`
4. **Dockerfile Path** should be: `Dockerfile` (relative to `/backend`)

---

### **Step 5: Add PostgreSQL Database**

1. In your project (not inside the service), click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway provisions a PostgreSQL database (~30 seconds)

**Important:** Railway automatically:
- Creates a `DATABASE_URL` variable
- Links it to your backend service
- No manual connection needed!

---

### **Step 6: Link Database to Backend** (if not auto-linked)

If the database isn't automatically linked:

1. Click on your **backend service**
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** → **"Add Reference"**
4. Select `DATABASE_URL` from your PostgreSQL service
5. Save

---

### **Step 7: Add Environment Variables**

In your backend service → **Variables** tab, add:

```env
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_SECRET=<your-random-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS (use wildcard for testing, update later with Vercel URL)
CORS_ORIGINS=*
```

**Note:** `DATABASE_URL` should already exist (auto-added by Railway)

---

### **Step 8: Deploy & Wait**

1. Railway automatically deploys when you save variables
2. Watch the **"Logs"** tab to see the build progress
3. You should see:
   ```
   📦 Running database migrations...
   🔧 Ensuring Prisma Client is generated...
   ✅ Database setup complete!
   🚀 Starting application...
   ```
4. Deployment takes ~2-3 minutes

---

### **Step 9: Get Your Backend URL**

1. Go to **"Settings"** tab
2. Scroll to **"Domains"** section
3. Railway generates a domain like:
   ```
   https://kinzen-backend-production-xxxx.up.railway.app
   ```
4. Click the **"Copy"** button

---

### **Step 10: Test Your Backend**

Open these URLs in your browser:

**Health Check:**
```
https://your-railway-url.up.railway.app/api/v1/health
```

Should return:
```json
{"status":"ok","info":{"database":{"status":"up"}},...}
```

**Swagger Docs:**
```
https://your-railway-url.up.railway.app/docs
```

Should show the Swagger UI with your API documentation.

---

## 🗂️ Project Structure in Railway

Your Railway project will look like this:

```
Kinzen Project
├── kinzen-backend-production     (Your NestJS backend)
│   └── Root Directory: backend   ← Key setting!
└── PostgreSQL                    (Database)
    └── Auto-linked to backend
```

---

## 🔄 Auto-Deploy from GitHub

Once configured, Railway automatically deploys when you push to `main`:

```bash
# Make changes to your code
git add .
git commit -m "Update backend"
git push origin main

# Railway automatically:
# 1. Detects the push
# 2. Builds from /backend directory
# 3. Runs migrations via docker-entrypoint.sh
# 4. Deploys new version
# 5. Zero downtime!
```

---

## 🎯 Why This Works

1. **Root Directory Setting**: Tells Railway to look in `/backend` folder
2. **Dockerfile**: Railway uses your existing Dockerfile
3. **Auto Migrations**: Our `docker-entrypoint.sh` runs migrations automatically
4. **Database**: Railway's PostgreSQL is managed and auto-linked
5. **Environment Variables**: Securely stored in Railway

---

## 🐛 Troubleshooting

### "Build Failed" or "No Dockerfile Found"

**Check:**
- Root Directory is set to `backend` (not `/backend`)
- Builder is set to `DOCKERFILE`
- Your Dockerfile exists at `/backend/Dockerfile` in GitHub

### "Database Connection Failed"

**Check:**
- PostgreSQL service is running (green indicator)
- `DATABASE_URL` exists in backend variables
- Database and backend are in the same project

### "Migrations Failed"

**View logs to see the error:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# View logs
railway logs

# Manually run migrations if needed
railway run npx prisma migrate deploy
```

### "Repository Not Found"

**Fix GitHub permissions:**
1. Railway → Account Settings → Integrations
2. Configure GitHub App
3. Grant access to your repository

---

## 📊 Expected Costs

| Resource | Usage | Monthly Cost |
|----------|-------|-------------|
| Backend Service | ~$3-5 | Included in $5 credit |
| PostgreSQL | ~$2-5 | Included in $5 credit |
| **Total** | | **~$5-10/month** |

**Free Trial:** $5 credit per month (usually enough for personal projects)

---

## ✅ Success Checklist

- [ ] Repository access configured in Railway
- [ ] Project created from GitHub
- [ ] Root Directory set to `backend`
- [ ] Builder set to `DOCKERFILE`
- [ ] PostgreSQL added and linked
- [ ] Environment variables configured
- [ ] Backend deployed successfully
- [ ] Health endpoint returns OK
- [ ] Swagger docs accessible
- [ ] Database migrations ran
- [ ] No errors in logs

---

## 🎉 You're Done!

Your monorepo backend is now deployed to Railway with automatic migrations and deployments!

**Next Steps:**
1. Update Vercel with your Railway URL
2. Update CORS with your Vercel URL
3. Test the full stack
