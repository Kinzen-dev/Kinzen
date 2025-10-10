# Terragrunt Railway Deployment

Complete Infrastructure as Code setup for deploying Kinzen backend to Railway using Terragrunt.

## 🎯 What This Does

- ✅ **Creates Railway project** with proper naming
- ✅ **Deploys PostgreSQL database** automatically
- ✅ **Deploys NestJS backend** from GitHub
- ✅ **Generates JWT secrets** securely
- ✅ **Configures all environment variables**
- ✅ **Links database to backend** automatically
- ✅ **Manages state** with Terragrunt
- ✅ **Supports multiple environments**

---

## 🏗️ Architecture

```
Terragrunt Structure:
├── terragrunt.hcl              # Root configuration
├── modules/railway/            # Reusable Terraform module
│   ├── main.tf                 # Railway resources
│   ├── variables.tf            # Input variables
│   └── outputs.tf              # Output values
├── environments/               # Environment-specific configs
│   └── production/
│       ├── terragrunt.hcl      # Production overrides
│       └── env.hcl             # Environment variables
└── deploy.sh                   # Deployment script
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
brew install terraform terragrunt
npm install -g @railway/cli

# Login to Railway
railway login
```

### Deploy to Production

```bash
cd infrastructure/railway/terragrunt

# Option 1: Use deployment script (recommended)
./deploy.sh production

# Option 2: Manual deployment
cd environments/production
terragrunt plan
terragrunt apply
```

---

## 📋 Step-by-Step Guide

### Step 1: Setup Authentication

```bash
# Login to Railway (opens browser)
railway login

# Verify authentication
railway whoami
```

### Step 2: Deploy Infrastructure

```bash
cd infrastructure/railway/terragrunt

# Deploy to production
./deploy.sh production
```

**What happens:**
1. ✅ Checks dependencies (Terraform, Terragrunt, Railway CLI)
2. ✅ Verifies Railway authentication
3. ✅ Initializes Terragrunt
4. ✅ Plans deployment (shows what will be created)
5. ✅ Asks for confirmation
6. ✅ Applies deployment
7. ✅ Shows outputs (URLs, secrets, etc.)

### Step 3: Get Your Backend URL

After deployment, you'll see output like:

```bash
backend_url = "https://kinzen-backend-production-xxxx.up.railway.app"
```

### Step 4: Update Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api/v1
   ```
3. Redeploy frontend

---

## 🔧 Manual Commands

### Initialize Terragrunt

```bash
cd environments/production
terragrunt init
```

### Plan Deployment

```bash
terragrunt plan
```

### Apply Deployment

```bash
terragrunt apply
```

### View Outputs

```bash
# All outputs
terragrunt output

# Specific output
terragrunt output backend_url

# JSON format
terragrunt output -json
```

### Destroy Resources

```bash
terragrunt destroy
```

---

## 🌍 Multiple Environments

### Add Staging Environment

```bash
# Create staging directory
mkdir -p environments/staging

# Create staging config
cat > environments/staging/terragrunt.hcl << 'EOF'
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/railway"
}

inputs = {
  environment   = "staging"
  cors_origins  = "https://staging.yourdomain.com"
  node_env      = "staging"
  github_repo   = "Kinzen-dev/Kinzen"
  github_branch = "develop"
}
EOF

# Create environment file
cat > environments/staging/env.hcl << 'EOF'
locals {
  environment = "staging"
}
EOF

# Deploy staging
./deploy.sh staging
```

### Add Development Environment

```bash
# Create dev directory
mkdir -p environments/dev

# Create dev config
cat > environments/dev/terragrunt.hcl << 'EOF'
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/railway"
}

inputs = {
  environment   = "dev"
  cors_origins  = "http://localhost:3000"
  node_env      = "development"
  github_repo   = "Kinzen-dev/Kinzen"
  github_branch = "develop"
}
EOF

# Create environment file
cat > environments/dev/env.hcl << 'EOF'
locals {
  environment = "dev"
}
EOF

# Deploy dev
./deploy.sh dev
```

---

## 🔐 Security & Secrets

### JWT Secrets

Terragrunt automatically generates secure JWT secrets:

```bash
# View secrets (sensitive)
terragrunt output jwt_secret
terragrunt output jwt_refresh_secret
```

### Environment Variables

All secrets are stored securely in Railway:

```bash
# View all variables
railway variables

# View specific variable
railway variables get JWT_SECRET
```

### State Management

Terragrunt state is stored locally:

```bash
# State location
ls -la terraform.tfstate.d/production/
```

**For production, consider using remote state:**

```hcl
# In terragrunt.hcl
remote_state {
  backend = "s3"
  config = {
    bucket = "your-terraform-state-bucket"
    key    = "railway/${local.env}/terraform.tfstate"
    region = "us-west-2"
  }
}
```

---

## 📊 Monitoring & Management

### View Railway Resources

```bash
# List projects
railway projects

# View services
railway services

# View logs
railway logs

# View metrics
railway metrics
```

### Terragrunt Commands

```bash
# Show current configuration
terragrunt show

# Validate configuration
terragrunt validate

# Format configuration
terragrunt fmt

# Show state
terragrunt state list
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Railway Provider Not Found**
```bash
# Update provider
terragrunt init -upgrade
```

**2. Authentication Failed**
```bash
# Re-login to Railway
railway logout
railway login
```

**3. State Conflicts**
```bash
# Refresh state
terragrunt refresh

# Import existing resources
terragrunt import railway_project.kinzen <project-id>
```

**4. Module Not Found**
```bash
# Re-initialize
terragrunt init --reconfigure
```

### Debug Mode

```bash
# Enable debug logging
export TF_LOG=DEBUG
terragrunt apply
```

### Clean State

```bash
# Remove local state (careful!)
rm -rf terraform.tfstate.d/
terragrunt init
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/terragrunt.yml
name: Terragrunt Deploy
on:
  push:
    branches: [main]
    paths: ['infrastructure/railway/terragrunt/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        
      - name: Setup Terragrunt
        run: |
          wget https://github.com/gruntwork-io/terragrunt/releases/download/v0.50.0/terragrunt_linux_amd64
          chmod +x terragrunt_linux_amd64
          sudo mv terragrunt_linux_amd64 /usr/local/bin/terragrunt
          
      - name: Setup Railway CLI
        run: npm install -g @railway/cli
        
      - name: Deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd infrastructure/railway/terragrunt
          ./deploy.sh production
```

### Environment Variables

Set these in your CI/CD:

```bash
RAILWAY_TOKEN=your-railway-token
TF_VAR_cors_origins=https://your-frontend.vercel.app
```

---

## 📚 Advanced Configuration

### Custom Variables

```hcl
# environments/production/terragrunt.hcl
inputs = {
  environment = "production"
  cors_origins = "https://yourdomain.com"
  
  # Custom overrides
  port = "3001"
  api_prefix = "api/v1"
  
  # GitHub settings
  github_repo = "Kinzen-dev/Kinzen"
  github_branch = "main"
}
```

### Multiple Services

```hcl
# modules/railway/main.tf
# Add Redis service
resource "railway_service" "redis" {
  project_id = railway_project.kinzen.id
  name       = "redis"
  source = {
    image = "redis:7-alpine"
  }
}

# Add Redis variables to backend
resource "railway_service_instance_variable" "redis_host" {
  project_id = railway_project.kinzen.id
  service_id = railway_service.backend.id
  name       = "REDIS_HOST"
  value      = railway_service.redis.host
}
```

### Custom Domains

```hcl
# Add custom domain
resource "railway_domain" "api" {
  project_id = railway_project.kinzen.id
  service_id = railway_service.backend.id
  domain     = "api.yourdomain.com"
}
```

---

## 📈 Cost Optimization

### Resource Sizing

```hcl
# Customize resource allocation
resource "railway_service" "backend" {
  # ... other config
  
  # Resource limits
  cpu_limit    = "0.5"
  memory_limit = "512MB"
}
```

### Environment-Specific Sizing

```hcl
# environments/dev/terragrunt.hcl
inputs = {
  # Smaller resources for dev
  cpu_limit    = "0.25"
  memory_limit = "256MB"
}

# environments/production/terragrunt.hcl
inputs = {
  # Larger resources for production
  cpu_limit    = "1.0"
  memory_limit = "1GB"
}
```

---

## 🎯 Best Practices

### 1. State Management
- ✅ Use remote state for production
- ✅ Enable state locking
- ✅ Regular state backups

### 2. Security
- ✅ Never commit secrets to Git
- ✅ Use environment variables for sensitive data
- ✅ Rotate secrets regularly

### 3. Version Control
- ✅ Pin provider versions
- ✅ Use semantic versioning for modules
- ✅ Document all changes

### 4. Testing
- ✅ Test in dev/staging first
- ✅ Use `terragrunt plan` before apply
- ✅ Validate configurations

---

## 📞 Support

- **Terragrunt Docs:** https://terragrunt.gruntwork.io/
- **Railway Docs:** https://docs.railway.app/
- **Terraform Railway Provider:** https://registry.terraform.io/providers/terraform-community-providers/railway

---

## 🎉 You're Ready!

Your infrastructure is now fully automated with Terragrunt! 

**Next steps:**
1. Deploy with `./deploy.sh production`
2. Update Vercel with your backend URL
3. Test your full stack
4. Set up CI/CD for automated deployments

**Happy deploying!** 🚀
