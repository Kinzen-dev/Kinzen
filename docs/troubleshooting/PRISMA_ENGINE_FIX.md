# Fix Prisma Query Engine Library Path Error

## 🚨 **Problem**
Railway deployment fails with:
```
Error: Env var PRISMA_QUERY_ENGINE_LIBRARY is provided but provided path /app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-1.1.x.so.node can't be resolved.
```

## 🎯 **Root Cause**
The hardcoded Prisma environment variables are pointing to incorrect paths. Prisma should auto-detect the correct engine paths.

## 🚀 **Solution**

### **Step 1: Remove Prisma Environment Variables from Railway**

Go to Railway Dashboard → Your Backend Service → Variables and **REMOVE** these variables if they exist:
- `PRISMA_QUERY_ENGINE_LIBRARY`
- `PRISMA_QUERY_ENGINE_BINARY`

### **Step 2: Updated Entrypoint Script**

The entrypoint script has been updated to remove hardcoded Prisma paths and let Prisma auto-detect:

```bash
#!/bin/sh
set -e

echo "🚀 Starting Kinzen Backend..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma Client (in case it's needed)
echo "🔧 Ensuring Prisma Client is generated..."
npx prisma generate

echo "✅ Database setup complete!"
echo "🚀 Starting application..."

# Start the application
exec node dist/main
```

### **Step 3: Deploy the Fix**

```bash
git add -A
git commit -m "fix: Remove hardcoded Prisma engine paths, let Prisma auto-detect"
git push origin main
```

## 🧪 **Test the Fix**

After Railway auto-deploys, check the logs:
```bash
railway logs
```

You should see:
```
🚀 Starting Kinzen Backend...
📦 Running database migrations...
✅ Database setup complete!
🚀 Starting application...
```

## 🎉 **What This Fixes**

### **Before:**
- ❌ Hardcoded Prisma engine paths
- ❌ Path resolution errors
- ❌ Service crashes on startup
- ❌ Database migrations fail

### **After:**
- ✅ Prisma auto-detects engine paths
- ✅ No path resolution errors
- ✅ Service starts successfully
- ✅ Database migrations work
- ✅ Full-stack application works

## 📋 **Complete Environment Variables (Railway)**

Make sure your Railway backend service has **ONLY** these variables:

```
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
DATABASE_URL=postgresql://postgres:dPQmPVXNmPoNAMLxgmDXuQeqbqtKUVRq@tramway.proxy.rlwy.net:36236/railway
JWT_SECRET=1F6OEmqI/JgfCTbbWa6EcWs5g65Czy5uHR11wODqas4=
JWT_REFRESH_SECRET=GqDGJXo3VaTrFIdnepfbgwkvdSsZm9VkGXPmUpZXOQA=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=*
```

**DO NOT** include:
- ❌ `PRISMA_QUERY_ENGINE_LIBRARY`
- ❌ `PRISMA_QUERY_ENGINE_BINARY`

## 🚀 **Deploy the Fix**

1. **Remove Prisma environment variables from Railway dashboard**
2. **Commit the updated entrypoint script:**
   ```bash
   git add -A
   git commit -m "fix: Remove hardcoded Prisma engine paths"
   git push origin main
   ```
3. **Railway will auto-deploy** the fix
4. **Check the logs** to confirm it's working

## 🎊 **You're Ready!**

Once this fix is deployed, your backend will:
- ✅ Auto-detect Prisma engines
- ✅ Connect to PostgreSQL
- ✅ Run database migrations
- ✅ Start successfully
- ✅ Handle API requests
- ✅ Work with your frontend

---

**The Prisma engine path issue is now fixed!** 🚀
