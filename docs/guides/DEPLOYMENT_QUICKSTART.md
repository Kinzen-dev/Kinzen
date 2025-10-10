# 🚀 Deployment Quick Start

You've chosen to set up deployment! Here's your streamlined guide.

## ⏱️ Time Required: 60-90 minutes

---

## 🎯 Overview

We'll set up:
- ✅ Docker Hub (for container images)
- ✅ Vercel (for frontend hosting)
- ✅ GitHub Actions (automated deployment)

---

## 🛠️ Option 1: Use the Helper Script (Easiest)

I've created a helper script to guide you:

```bash
cd /Users/triok.t/kinzen/portfolio
./scripts/deployment-helper.sh
```

**The script will:**
- ✅ Check Docker installation
- ✅ Test Docker Hub login
- ✅ Build test images
- ✅ Install/check Vercel CLI
- ✅ Link Vercel project
- ✅ Show you GitHub secrets format

**Just follow the prompts!** 🎯

---

## 📋 Option 2: Manual Step-by-Step

If you prefer manual setup, follow these steps:

### Step 1: Docker Hub (20 minutes)

1. **Create account**: https://hub.docker.com/signup
2. **Create access token**:
   - Profile → Account Settings → Security
   - "New Access Token"
   - Name: `kinzen-ci-cd`
   - Permissions: Read, Write, Delete
   - **Copy the token!** ⚠️

3. **Test locally**:
   ```bash
   docker login -u YOUR_USERNAME
   # Paste your access token when prompted
   
   # Build test image
   cd backend
   docker build -t YOUR_USERNAME/kinzen-backend:test .
   
   # Push test image
   docker push YOUR_USERNAME/kinzen-backend:test
   ```

### Step 2: Vercel (20 minutes)

1. **Create account**: https://vercel.com/signup (use GitHub)

2. **Install CLI**:
   ```bash
   npm install -g vercel
   ```

3. **Link project**:
   ```bash
   cd frontend
   vercel login
   vercel link
   # Answer prompts:
   # - Set up and deploy? N
   # - Link to existing? N  
   # - Project name? kinzen-frontend
   ```

4. **Get credentials**:
   ```bash
   cat .vercel/project.json
   # Save the orgId and projectId
   ```

5. **Create token**: https://vercel.com/account/tokens
   - Name: `kinzen-ci-cd`
   - **Copy the token!** ⚠️

### Step 3: GitHub Secrets (10 minutes)

Go to: https://github.com/Kinzen-dev/Kinzen/settings/secrets/actions

Add these 5 secrets:

| Secret Name | Where to Get It |
|------------|----------------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Access token from Step 1.2 |
| `VERCEL_TOKEN` | Token from Step 2.5 |
| `VERCEL_ORG_ID` | From `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` |

### Step 4: Enable Build Jobs (10 minutes)

1. **Edit backend workflow**:
   ```bash
   code .github/workflows/backend-ci.yml
   ```
   
   Uncomment lines 106-143 (the `build:` job)

2. **Edit frontend workflow**:
   ```bash
   code .github/workflows/frontend-ci.yml
   ```
   
   Uncomment lines 56-93 (the `build:` job)

3. **Commit and push**:
   ```bash
   git add .github/workflows/
   git commit -m "chore: Enable Docker build jobs"
   git push origin main
   ```

4. **Watch**: https://github.com/Kinzen-dev/Kinzen/actions

### Step 5: Enable Deploy Jobs (10 minutes)

**⚠️ Only after build jobs succeed!**

1. **Edit frontend workflow**:
   ```bash
   code .github/workflows/frontend-ci.yml
   ```
   
   Uncomment lines 95-133 (deploy jobs)

2. **Commit and push**:
   ```bash
   git add .github/workflows/frontend-ci.yml
   git commit -m "chore: Enable Vercel deployment"
   git push origin main
   ```

3. **Get your live URL**: Check Vercel dashboard!

---

## ✅ Verification Checklist

- [ ] Docker Hub account created
- [ ] Docker Hub access token created
- [ ] Can login with: `docker login`
- [ ] Test image built and pushed successfully
- [ ] Vercel account created
- [ ] Vercel CLI installed
- [ ] Project linked to Vercel
- [ ] Vercel token created
- [ ] All 5 GitHub secrets added
- [ ] Build jobs enabled and passing
- [ ] Deploy jobs enabled and passing
- [ ] Frontend live on Vercel URL

---

## 🐛 Common Issues

### Docker Login Fails
```bash
# Make sure you use the ACCESS TOKEN, not your password!
docker logout
docker login -u YOUR_USERNAME
# Paste the access token
```

### Vercel Link Fails
```bash
# Make sure you're in the frontend directory
cd frontend
vercel login
vercel link --yes
```

### GitHub Actions Fails
- Check that all 5 secrets are added correctly
- Check secret names match exactly (case-sensitive)
- Check that tokens haven't expired

---

## 🎯 After Deployment

Once everything is set up:

```
Every push to main:
  1. ✅ Tests run automatically
  2. ✅ Docker images built
  3. ✅ Images pushed to Docker Hub
  4. ✅ Frontend deployed to Vercel
  5. ✅ Live URL updated!
```

**Your workflow:**
```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Wait 2-3 minutes
# Check: https://github.com/Kinzen-dev/Kinzen/actions
# Your changes are LIVE! 🚀
```

---

## 📚 Full Documentation

For detailed guide with troubleshooting:
- 📖 [DEPLOYMENT_SETUP_CHECKLIST.md](./DEPLOYMENT_SETUP_CHECKLIST.md)

---

## 🚀 Let's Go!

**Choose your path:**

1. **Easy**: Run the helper script
   ```bash
   ./scripts/deployment-helper.sh
   ```

2. **Manual**: Follow Option 2 above

**Either way, you'll be deployed in ~1 hour!** 🎉

---

## 💡 Pro Tips

1. **Keep tokens safe** - Never commit them!
2. **Test locally first** - Make sure Docker and Vercel work
3. **One step at a time** - Don't rush
4. **Check Actions tab** - Watch your deployments
5. **Ask for help** - If stuck, just ask!

---

**Ready? Let's deploy your app! 🚀**

