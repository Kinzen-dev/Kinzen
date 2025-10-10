# Railway Infrastructure as Code

Deploy your Kinzen backend to Railway using automated scripts instead of GUI.

## 🎯 Available Options

### Option 1: Railway CLI Script (Recommended) ⚡
**Best for:** Quick deployment, simple automation

### Option 2: Terraform 🏗️
**Best for:** Full IaC, version control, team collaboration

### Option 3: GitHub Actions 🤖
**Best for:** Automated CI/CD (already configured!)

---

## 🚀 Option 1: Railway CLI Script

### Prerequisites
```bash
# Install Node.js (you already have this)
node --version

# Install Railway CLI (script does this automatically)
npm install -g @railway/cli
```

### Usage

**1. Make the script executable:**
```bash
chmod +x infrastructure/railway/railway.sh
```

**2. Run the script:**
```bash
cd infrastructure/railway
./railway.sh
```

**What it does:**
- ✅ Installs Railway CLI if needed
- ✅ Authenticates with Railway
- ✅ Creates/links project
- ✅ Adds PostgreSQL database
- ✅ Generates JWT secrets
- ✅ Sets all environment variables
- ✅ Deploys your backend

**3. Manual commands (if you prefer control):**
```bash
# Login
railway login

# Link to existing project (if you already created one)
railway link

# Add database
railway add --database postgres

# Set variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
# ... etc

# Deploy
cd backend
railway up

# View logs
railway logs

# Get domain
railway domain
```

---

## 🏗️ Option 2: Terraform

### Prerequisites

**1. Install Terraform:**
```bash
# macOS
brew install terraform

# Or download from: https://www.terraform.io/downloads
```

**2. Get Railway API Token:**
```bash
# Login to Railway
railway login

# Get your token
railway whoami --token
```

**3. Set environment variable:**
```bash
export RAILWAY_TOKEN="your-token-here"
```

### Usage

**1. Initialize Terraform:**
```bash
cd infrastructure/railway/terraform
terraform init
```

**2. Plan deployment:**
```bash
terraform plan
```

**3. Apply configuration:**
```bash
terraform apply
```

**4. Get outputs:**
```bash
# View all outputs
terraform output

# Get backend URL
terraform output backend_url

# Get secrets (securely)
terraform output -json jwt_secret
```

**5. Destroy (if needed):**
```bash
terraform destroy
```

### What Terraform Creates

```
Railway Project: kinzen-backend
├── PostgreSQL Service
│   └── postgres:16-alpine
└── Backend Service
    ├── Source: Kinzen-dev/Kinzen (main branch)
    ├── Root Directory: backend
    ├── Environment Variables (9 total)
    └── Linked to PostgreSQL
```

---

## 🤖 Option 3: GitHub Actions (Already Set Up!)

You already have CI/CD configured! Just push to main:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

**What happens:**
1. ✅ Tests run automatically
2. ✅ Docker image builds
3. ✅ Pushes to Docker Hub
4. ✅ Railway pulls new image (if configured)

---

## 🔄 Terragrunt (Advanced)

If you want to use Terragrunt for managing multiple environments:

### Structure:
```
infrastructure/railway/
├── terragrunt.hcl           # Root config
├── environments/
│   ├── dev/
│   │   └── terragrunt.hcl
│   ├── staging/
│   │   └── terragrunt.hcl
│   └── production/
│       └── terragrunt.hcl
└── modules/
    └── railway/             # Terraform module
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### Commands:
```bash
cd infrastructure/railway/environments/production
terragrunt plan
terragrunt apply
```

Would you like me to set up Terragrunt too?

---

## 📊 Comparison

| Method | Setup Time | Flexibility | Best For |
|--------|-----------|-------------|----------|
| **CLI Script** | 5 min | Medium | Quick start |
| **Terraform** | 10 min | High | IaC, teams |
| **GitHub Actions** | 0 min | High | Auto-deploy |
| **Terragrunt** | 20 min | Highest | Multi-env |

---

## 🔐 Security Best Practices

### Store Secrets Securely

**Option 1: Environment Variables**
```bash
export RAILWAY_TOKEN="..."
export JWT_SECRET="..."
```

**Option 2: `.env` file (gitignored)**
```bash
# infrastructure/railway/.env
RAILWAY_TOKEN=your-token
CORS_ORIGINS=https://your-frontend.vercel.app
```

**Option 3: Secret Manager**
```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id railway-token

# HashiCorp Vault
vault kv get secret/railway
```

---

## 🐛 Troubleshooting

### Railway CLI Issues

**Login fails:**
```bash
railway logout
railway login --browserless
```

**Project not found:**
```bash
railway unlink
railway link
```

### Terraform Issues

**Provider not found:**
```bash
terraform init -upgrade
```

**State conflicts:**
```bash
terraform state list
terraform state rm <resource>
```

---

## 📚 Resources

- [Railway CLI Docs](https://docs.railway.app/develop/cli)
- [Railway API Docs](https://docs.railway.app/reference/api)
- [Terraform Railway Provider](https://registry.terraform.io/providers/terraform-community-providers/railway)
- [Terragrunt Docs](https://terragrunt.gruntwork.io/)

---

## 🎯 Recommendation

For your use case, I recommend:

**Now (Quick Start):**
```bash
./railway.sh
```

**Later (Production):**
```bash
cd terraform
terraform apply
```

**Always (CI/CD):**
```bash
git push origin main
```

Choose what fits your workflow! 🚀

