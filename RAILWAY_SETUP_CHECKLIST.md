# 🚂 Railway Deployment Checklist

Quick reference checklist for deploying to Railway. Follow this step-by-step!

## 📋 Before You Start

- [ ] You have a GitHub account
- [ ] Your code is pushed to GitHub (main branch)
- [ ] You have 10 minutes

---

## 🚀 Deployment Steps

### ☁️ Step 1: Setup Railway Account (2 min)

- [ ] Go to https://railway.app
- [ ] Click "Login" → "Login with GitHub"
- [ ] Authorize Railway to access your repositories

### 📦 Step 2: Deploy Backend (3 min)

- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose `Kinzen` repository
- [ ] Railway starts deploying...

### ⚙️ Step 3: Configure Backend (2 min)

- [ ] Go to your deployed service → "Settings"
- [ ] Set **Root Directory** to: `backend`
- [ ] Verify **Builder** is set to: `Docker`
- [ ] Save settings

### 🗄️ Step 4: Add Database (1 min)

- [ ] Click "+ New" → "Database" → "PostgreSQL"
- [ ] Wait for provisioning (30 seconds)
- [ ] Database is auto-linked to backend! ✅

### 🔐 Step 5: Set Environment Variables (2 min)

Go to backend service → "Variables" tab → Add these:

#### Required Variables:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate-random-32-char-string>
JWT_REFRESH_SECRET=<generate-another-random-32-char-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
API_PREFIX=api/v1
CORS_ORIGINS=*
```

**Generate JWT secrets:**

```bash
# Run this twice (once for each secret)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] All variables added
- [ ] Clicked "Deploy" or wait for auto-deploy

### ✅ Step 6: Verify Deployment (1 min)

- [ ] Wait for deployment to complete (~2 min)
- [ ] Go to "Settings" → "Domains"
- [ ] Copy your Railway URL (e.g., `https://kinzen-backend-production.up.railway.app`)
- [ ] Test health endpoint:
  ```bash
  curl https://YOUR-RAILWAY-URL/api/v1/health
  ```
- [ ] Should return: `{"status":"ok",...}`
- [ ] Test Swagger docs: `https://YOUR-RAILWAY-URL/docs`

### 🌐 Step 7: Update Vercel (2 min)

- [ ] Go to https://vercel.com/dashboard
- [ ] Select your `kinzen-frontend` project
- [ ] Go to "Settings" → "Environment Variables"
- [ ] Add or update:
  ```
  Name: NEXT_PUBLIC_API_URL
  Value: https://YOUR-RAILWAY-URL/api/v1
  ```
- [ ] Select all environments (Production, Preview, Development)
- [ ] Click "Save"

### 🔄 Step 8: Redeploy Frontend (1 min)

Choose one method:

**Method A: Via Git**

```bash
git commit --allow-empty -m "chore: update API URL"
git push origin main
```

**Method B: Via Vercel Dashboard**

- [ ] Go to "Deployments" tab
- [ ] Click "..." on latest deployment
- [ ] Click "Redeploy"

### 🔒 Step 9: Update CORS (1 min)

- [ ] Wait for Vercel deployment to complete
- [ ] Copy your Vercel production URL
- [ ] Go back to Railway → Your backend → "Variables"
- [ ] Update `CORS_ORIGINS`:
  ```
  https://your-actual-vercel-url.vercel.app
  ```
- [ ] Railway auto-redeploys

### 🎉 Step 10: Final Test

- [ ] Visit your Vercel frontend URL
- [ ] Open browser DevTools (F12) → Network tab
- [ ] Try to login or interact with the app
- [ ] Verify API calls go to Railway (not localhost)
- [ ] Verify no CORS errors
- [ ] Everything works! 🎊

---

## ✅ Success Checklist

- [ ] Backend deployed to Railway
- [ ] PostgreSQL database created and connected
- [ ] Migrations ran successfully (check Railway logs)
- [ ] Environment variables set
- [ ] Health endpoint works
- [ ] Swagger docs accessible
- [ ] Frontend updated with Railway URL
- [ ] Frontend redeployed
- [ ] CORS configured correctly
- [ ] No errors in browser console
- [ ] Can interact with API from frontend

---

## 🐛 Troubleshooting

### Backend Won't Start

1. Check Railway logs: Go to service → "Logs" tab
2. Common issues:
   - Missing environment variable
   - Database connection failed
   - Migration error

### Database Migration Failed

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
cd backend
railway link

# Manually run migrations
railway run npx prisma migrate deploy
```

### CORS Errors

- Make sure `CORS_ORIGINS` exactly matches your Vercel URL
- No trailing slashes!
- Include `https://` prefix

### Frontend Still Calls localhost

- Verify environment variable in Vercel: Settings → Environment Variables
- Make sure you redeployed after adding the variable
- Check browser console for the actual URL being called

---

## 💰 Cost Estimate

**Monthly cost with Railway:**

- First month: **FREE** ($5 credit)
- Typical usage: **$5-10/month**
  - Backend service: ~$3-5
  - PostgreSQL: ~$2-5

**Monitor usage:**

- Railway Dashboard → Project Settings → Usage

---

## 📚 Full Documentation

For detailed explanations, see:

- [Railway Deployment Guide](./docs/setup/RAILWAY_DEPLOYMENT.md)
- [Backend Deployment Options](./docs/setup/BACKEND_DEPLOYMENT_OPTIONS.md)

---

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app/
- **Railway Discord:** https://discord.gg/railway
- **Issues:** Open a GitHub issue in your repo

---

**🎉 Ready? Let's deploy! Start with Step 1! 🚀**
