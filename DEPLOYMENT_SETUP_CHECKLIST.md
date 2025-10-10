# 🚀 Deployment Setup Checklist

## Overview

This guide will help you enable the full CI/CD pipeline with build and deployment.

**Current Status:**

- ✅ Tests: Fully automated
- 🔄 Build: Ready to enable (needs credentials)
- 🔄 Deploy: Ready to enable (needs credentials)

**Time Required:** ~1-2 hours for first-time setup

---

## 📋 Step-by-Step Checklist

### Phase 1: Docker Hub Setup (30 minutes)

**Why:** Build and store Docker container images

- [ ] **1.1 Create Docker Hub Account**
  - Go to: https://hub.docker.com/signup
  - Sign up with email
  - Verify email address
  - Choose free plan (sufficient for this project)

- [ ] **1.2 Create Access Token**

  ```
  1. Log in to Docker Hub
  2. Click your profile → Account Settings
  3. Security → New Access Token
  4. Name: "kinzen-ci-cd"
  5. Permissions: Read, Write, Delete
  6. Click "Generate"
  7. ⚠️ COPY THE TOKEN NOW (you won't see it again!)
  ```

- [ ] **1.3 Add Secrets to GitHub**

  ```
  1. Go to: https://github.com/Kinzen-dev/Kinzen/settings/secrets/actions
  2. Click "New repository secret"

  Secret 1:
  - Name: DOCKER_USERNAME
  - Value: your-dockerhub-username

  Secret 2:
  - Name: DOCKER_PASSWORD
  - Value: your-access-token-from-step-1.2
  ```

- [ ] **1.4 Test Docker Hub Access (Local)**

  ```bash
  # Log in to Docker Hub from your terminal
  docker login -u YOUR_USERNAME
  # Enter the access token when prompted

  # Build test image
  cd /Users/triok.t/kinzen/portfolio/backend
  docker build -t YOUR_USERNAME/kinzen-backend:test .

  # Push test image
  docker push YOUR_USERNAME/kinzen-backend:test

  # Verify on Docker Hub web UI that image appeared
  ```

---

### Phase 2: Vercel Setup for Frontend (30 minutes)

**Why:** Deploy Next.js frontend to production-ready hosting

- [ ] **2.1 Create Vercel Account**
  - Go to: https://vercel.com/signup
  - Sign up with GitHub (recommended - easier integration)
  - Authorize Vercel to access your GitHub account

- [ ] **2.2 Install Vercel CLI**

  ```bash
  npm install -g vercel
  ```

- [ ] **2.3 Link Your Project**

  ```bash
  cd /Users/triok.t/kinzen/portfolio/frontend
  vercel login
  # Follow the authentication flow

  vercel link
  # Answer the prompts:
  # - Set up and deploy? N (we'll do this via CI/CD)
  # - Which scope? Your account
  # - Link to existing project? N
  # - Project name? kinzen-frontend (or your choice)
  # - Directory? ./ (current directory)
  ```

- [ ] **2.4 Get Project IDs**

  ```bash
  # After linking, this file is created:
  cat .vercel/project.json

  # You'll see:
  # {
  #   "orgId": "team_xxxxx" or "user_xxxxx",
  #   "projectId": "prj_xxxxx"
  # }

  # ⚠️ IMPORTANT: Add .vercel/ to .gitignore (already done)
  # NEVER commit these files!
  ```

- [ ] **2.5 Create Vercel Token**

  ```
  1. Go to: https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Name: "kinzen-ci-cd"
  4. Scope: Full Account
  5. Expiration: No expiration (or 1 year)
  6. Click "Create"
  7. ⚠️ COPY THE TOKEN NOW!
  ```

- [ ] **2.6 Add Secrets to GitHub**

  ```
  Go to: https://github.com/Kinzen-dev/Kinzen/settings/secrets/actions

  Secret 3:
  - Name: VERCEL_TOKEN
  - Value: your-vercel-token-from-step-2.5

  Secret 4:
  - Name: VERCEL_ORG_ID
  - Value: the orgId from .vercel/project.json

  Secret 5:
  - Name: VERCEL_PROJECT_ID
  - Value: the projectId from .vercel/project.json
  ```

- [ ] **2.7 Test Vercel Deployment (Local)**

  ```bash
  cd /Users/triok.t/kinzen/portfolio/frontend

  # Deploy to preview
  vercel

  # You'll get a URL like: https://kinzen-frontend-xxxxx.vercel.app
  # Test it in your browser
  ```

---

### Phase 3: Enable Build Jobs (15 minutes)

- [ ] **3.1 Update Backend Workflow**

  ```bash
  # Edit the file
  code /Users/triok.t/kinzen/portfolio/.github/workflows/backend-ci.yml

  # Uncomment lines 106-143 (the build job)
  # Find these lines and remove the leading "# " from each:

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    # ... rest of the build job
  ```

- [ ] **3.2 Update Frontend Workflow**

  ```bash
  # Edit the file
  code /Users/triok.t/kinzen/portfolio/.github/workflows/frontend-ci.yml

  # Uncomment lines 56-93 (the build job)
  # Find these lines and remove the leading "# " from each:

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    # ... rest of the build job
  ```

- [ ] **3.3 Commit and Push**

  ```bash
  cd /Users/triok.t/kinzen/portfolio
  git add .github/workflows/
  git commit -m "chore: Enable Docker build jobs in CI/CD pipeline"
  git push origin main
  ```

- [ ] **3.4 Watch the Build**
  ```
  1. Go to: https://github.com/Kinzen-dev/Kinzen/actions
  2. Click on the latest workflow run
  3. You should see:
     ✅ test (passing)
     🔄 build (running...)
  4. Wait for build to complete (~2-3 minutes)
  5. Check Docker Hub to see your images!
  ```

---

### Phase 4: Enable Deployment Jobs (15 minutes)

⚠️ **IMPORTANT:** Only do this after Phase 3 succeeds!

- [ ] **4.1 Decide on Deployment Strategy**

  **Option A: Vercel Only (Frontend)**
  - Recommended for now
  - Free tier available
  - Auto-scaling
  - Easy to set up
  - Backend still manual deploy

  **Option B: Full Deployment (Backend + Frontend)**
  - Requires server infrastructure
  - Costs money (AWS, DigitalOcean, etc.)
  - More complex setup
  - Better for later when you're ready for production

  **Recommendation:** Start with Option A (Vercel only for frontend)

- [ ] **4.2 Enable Vercel Deployment (Frontend)**

  ```bash
  # Edit the file
  code /Users/triok.t/kinzen/portfolio/.github/workflows/frontend-ci.yml

  # Uncomment lines 95-133 (deploy-vercel jobs)
  ```

- [ ] **4.3 Configure Environment Variables on Vercel**

  ```
  1. Go to: https://vercel.com/dashboard
  2. Select your project (kinzen-frontend)
  3. Settings → Environment Variables
  4. Add:
     - NEXT_PUBLIC_API_URL
       Production: https://your-backend-url.com/api/v1
       Preview: https://your-backend-url.com/api/v1
       Development: http://localhost:3001/api/v1
  ```

- [ ] **4.4 Commit and Push**

  ```bash
  cd /Users/triok.t/kinzen/portfolio
  git add .github/workflows/frontend-ci.yml
  git commit -m "chore: Enable Vercel deployment in CI/CD pipeline"
  git push origin main
  ```

- [ ] **4.5 Watch the Deployment**
  ```
  1. Go to: https://github.com/Kinzen-dev/Kinzen/actions
  2. Watch the workflow
  3. After success, get your live URL from Vercel dashboard
  4. Test it!
  ```

---

## 🧪 Testing Your Deployment

### After Build Jobs Enabled

- [ ] Check Docker Hub for images

  ```
  1. Go to: https://hub.docker.com/repositories
  2. You should see:
     - kinzen-backend:main-xxxxx
     - kinzen-frontend:main-xxxxx
  ```

- [ ] Verify image tags
  ```bash
  # Pull and test an image locally
  docker pull YOUR_USERNAME/kinzen-backend:main-xxxxx
  docker run -p 3001:3001 YOUR_USERNAME/kinzen-backend:main-xxxxx
  ```

### After Deployment Enabled

- [ ] Test Frontend on Vercel

  ```
  1. Get URL from Vercel dashboard
  2. Open in browser
  3. Check that pages load
  4. Check console for errors
  ```

- [ ] Test API Connection
  ```
  1. Open browser dev tools
  2. Go to Network tab
  3. Try to login/register
  4. Check if API calls work
  5. If backend isn't deployed yet, you'll see CORS errors (expected)
  ```

---

## 🔄 Branch Strategy After Deployment

Once deployment is enabled:

```
develop branch
    ↓
Push changes
    ↓
✅ Tests run
    ↓
✅ Build images
    ↓
🚀 Deploy to STAGING
    ↓
Test on staging
    ↓
Create PR to main
    ↓
Merge to main
    ↓
✅ Tests run
    ↓
✅ Build images
    ↓
🚀 Deploy to PRODUCTION
```

---

## 🎯 Success Criteria

### Build Jobs Working

- ✅ Docker images appear in Docker Hub
- ✅ Images are tagged with branch-commit SHA
- ✅ Build completes in < 5 minutes
- ✅ Images can be pulled and run locally

### Deployment Working

- ✅ Frontend accessible at Vercel URL
- ✅ All pages load correctly
- ✅ No console errors (except API errors if backend not deployed)
- ✅ Environment variables loaded correctly
- ✅ Deployment completes in < 2 minutes

---

## 🐛 Troubleshooting

### Docker Build Fails

**Error: "denied: requested access to the resource is denied"**

```bash
# Solution: Check Docker Hub credentials in GitHub secrets
# Make sure DOCKER_USERNAME and DOCKER_PASSWORD are correct
```

**Error: "no such file or directory" during build**

```bash
# Solution: Check Dockerfile paths
# Make sure context is set correctly in workflow
```

### Vercel Deployment Fails

**Error: "Invalid token"**

```bash
# Solution: Regenerate Vercel token
# Make sure it's copied correctly to GitHub secrets
```

**Error: "Project not found"**

```bash
# Solution: Check VERCEL_PROJECT_ID in GitHub secrets
# Should match the projectId in .vercel/project.json
```

**Error: "Missing environment variables"**

```bash
# Solution: Add environment variables in Vercel dashboard
# Settings → Environment Variables
```

### Backend Deployment

**Note:** Backend deployment is commented out because it requires:

- A server (AWS EC2, DigitalOcean Droplet, etc.)
- Database (managed PostgreSQL)
- Redis (managed Redis)
- Domain name
- SSL certificates

**Recommendation:** Deploy backend manually first, then automate later

---

## 💰 Cost Estimate

### Free Tier (Recommended for Now)

- **Docker Hub**: Free for public repos (unlimited pulls)
- **Vercel**: Free tier includes:
  - Unlimited deployments
  - 100 GB bandwidth/month
  - Serverless functions
  - Automatic HTTPS
- **GitHub Actions**: Free for public repos
  - 2,000 minutes/month for private repos

**Total: $0/month** ✅

### If You Scale Up Later

- Docker Hub Pro: $5/month (for private images)
- Vercel Pro: $20/month (more bandwidth)
- Backend hosting: $5-50/month (depends on service)
- Database: $15-25/month (managed PostgreSQL)
- Redis: $10-20/month (managed Redis)

---

## 📚 Additional Resources

### Docker Hub

- [Getting Started](https://docs.docker.com/docker-hub/quickstart/)
- [Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)

### Vercel

- [Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [CLI Reference](https://vercel.com/docs/cli)

### GitHub Actions

- [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Build Action](https://github.com/docker/build-push-action)

---

## ✅ Final Checklist

Before enabling deployment, make sure:

- [ ] All tests are passing locally
- [ ] Docker Hub account created and working
- [ ] Vercel account created and working
- [ ] All 5 secrets added to GitHub
- [ ] Tested Docker build locally
- [ ] Tested Vercel deploy locally
- [ ] Read troubleshooting section
- [ ] Have time to monitor first deployment

---

## 🚀 Ready to Deploy?

If you've completed all the steps above, you're ready!

**Next command:**

```bash
cd /Users/triok.t/kinzen/portfolio
git add .github/workflows/
git commit -m "chore: Enable full CI/CD pipeline with build and deployment"
git push origin main
```

Then watch the magic happen at:
https://github.com/Kinzen-dev/Kinzen/actions

---

**Good luck! 🎉**
