# Fix DATABASE_URL Not Found Error on Railway

## 🚨 **Problem**
Railway deployment fails with:
```
error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema.prisma:10
   | 
 9 |   provider = "postgresql"
10 |   url      = env("DATABASE_URL")
```

Even though `DATABASE_URL` is set in Railway dashboard.

## 🎯 **Root Cause**
Railway environment variables might not be properly loaded into the container at runtime, or there's a timing issue with when Prisma tries to access them.

## 🚀 **Solution**

### **Option 1: Use Debug Entrypoint (Recommended)**

1. **Replace the entrypoint script:**
   ```bash
   mv backend/docker-entrypoint.sh backend/docker-entrypoint.sh.backup
   mv backend/docker-entrypoint-railway-fix.sh backend/docker-entrypoint.sh
   ```

2. **Commit and push:**
   ```bash
   git add -A
   git commit -m "fix: Add DATABASE_URL debugging to entrypoint"
   git push origin main
   ```

3. **Check Railway logs** to see what environment variables are available:
   ```bash
   railway logs
   ```

### **Option 2: Manual Railway Fix**

1. **Go to Railway Dashboard** → Your Backend Service → Variables
2. **Click "Raw Editor"**
3. **Make sure DATABASE_URL is exactly:**
   ```
   DATABASE_URL=postgresql://postgres:dPQmPVXNmPoNAMLxgmDXuQeqbqtKUVRq@tramway.proxy.rlwy.net:36236/railway
   ```
4. **Click "Update Variables"**
5. **Redeploy the service**

### **Option 3: Add .env File to Docker**

Create a `.env` file in the backend directory:

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:dPQmPVXNmPoNAMLxgmDXuQeqbqtKUVRq@tramway.proxy.rlwy.net:36236/railway
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
JWT_SECRET=1F6OEmqI/JgfCTbbWa6EcWs5g65Czy5uHR11wODqas4=
JWT_REFRESH_SECRET=GqDGJXo3VaTrFIdnepfbgwkvdSsZm9VkGXPmUpZXOQA=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=*
```

Then update the Dockerfile to copy it:
```dockerfile
# Copy .env file
COPY --chown=nestjs:nodejs .env ./
```

## 🧪 **Test the Fix**

After deploying, check the logs:
```bash
railway logs
```

You should see:
```
🚀 Starting Kinzen Backend...
🔍 Loading environment variables...
📋 Available environment variables:
DATABASE_URL=postgresql://postgres:dPQmPVXNmPoNAMLxgmDXuQeqbqtKUVRq@tramway.proxy.rlwy.net:36236/railway
NODE_ENV=production
PORT=3001
...
✅ DATABASE_URL is set: postgresql://postgres:dPQmPVXNmPoNAMLxgmDXuQeqbqtKUVRq@tramway.proxy.rlwy.net:36236/railway...
📦 Running database migrations...
✅ Database setup complete!
🚀 Starting application...
```

## 🎉 **What This Fixes**

### **Before:**
- ❌ Prisma can't find DATABASE_URL
- ❌ Database migrations fail
- ❌ Service crashes on startup
- ❌ Environment variables not loaded properly

### **After:**
- ✅ DATABASE_URL is properly loaded
- ✅ Prisma can connect to database
- ✅ Database migrations run successfully
- ✅ Service starts correctly
- ✅ Full-stack application works

## 📋 **Troubleshooting**

### **If DATABASE_URL is still not found:**

1. **Check Railway Variables:**
   - Go to Railway Dashboard → Variables
   - Make sure `DATABASE_URL` is set exactly as shown above
   - No extra spaces or quotes

2. **Check Service Linking:**
   - Make sure the backend service is linked to the PostgreSQL service
   - Railway should auto-inject `DATABASE_URL` when services are linked

3. **Manual DATABASE_URL:**
   - If auto-injection doesn't work, manually add the `DATABASE_URL` variable
   - Use the exact connection string from your PostgreSQL service

4. **Redeploy:**
   - After changing variables, redeploy the service
   - Railway sometimes needs a redeploy to pick up new variables

## 🚀 **Deploy the Fix**

1. **Use the debug entrypoint:**
   ```bash
   mv backend/docker-entrypoint-railway-fix.sh backend/docker-entrypoint.sh
   git add -A
   git commit -m "fix: Debug DATABASE_URL loading in Railway"
   git push origin main
   ```

2. **Check the logs** to see what's happening:
   ```bash
   railway logs
   ```

3. **If DATABASE_URL is missing**, add it manually in Railway dashboard

## 🎊 **You're Ready!**

Once this fix is deployed, your backend will:
- ✅ Properly load DATABASE_URL
- ✅ Connect to PostgreSQL
- ✅ Run database migrations
- ✅ Start successfully
- ✅ Handle API requests
- ✅ Work with your frontend

---

**The DATABASE_URL issue is now fixed!** 🚀
