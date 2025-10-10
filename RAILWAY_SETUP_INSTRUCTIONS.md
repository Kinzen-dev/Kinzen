
# Railway Backend Service Setup Instructions

## 🎯 Generated Configuration

### JWT Secrets (save securely):
JWT_SECRET=1F6OEmqI/JgfCTbbWa6EcWs5g65Czy5uHR11wODqas4=
JWT_REFRESH_SECRET=GqDGJXo3VaTrFIdnepfbgwkvdSsZm9VkGXPmUpZXOQA=

### Environment Variables:
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
JWT_SECRET=1F6OEmqI/JgfCTbbWa6EcWs5g65Czy5uHR11wODqas4=
JWT_REFRESH_SECRET=GqDGJXo3VaTrFIdnepfbgwkvdSsZm9VkGXPmUpZXOQA=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=*

## 🚀 Setup Steps

### Step 1: Create Backend Service
1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select project: kinzen-backend-production
3. Click "+ Create" → "Service"
4. Choose "GitHub Repo"
5. Select: Kinzen-dev/Kinzen
6. Set Root Directory: backend
7. Click "Deploy"

### Step 2: Add Environment Variables
1. Go to the new backend service
2. Click "Variables" tab
3. Add each variable from the list above
4. Click "Save"

### Step 3: Get Backend URL
1. Go to "Settings" → "Domains"
2. Copy the Railway URL
3. Your API endpoint will be: https://your-url.up.railway.app/api/v1

### Step 4: Update Vercel
1. Go to Vercel Dashboard
2. Select your frontend project
3. Go to Settings → Environment Variables
4. Add/Update: NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api/v1
5. Redeploy frontend

### Step 5: Update CORS
1. Go back to Railway → Backend Service → Variables
2. Update CORS_ORIGINS to your Vercel URL
3. Wait for auto-redeployment

## 🧪 Test Your Deployment
curl https://your-railway-url.up.railway.app/api/v1/health

## 📚 API Documentation
https://your-railway-url.up.railway.app/docs

## 🎉 You're Done!
Your backend is now deployed with Infrastructure as Code!
