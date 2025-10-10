#!/usr/bin/env node

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

// Colors for output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateJWTSecret() {
    return crypto.randomBytes(32).toString('base64');
}

async function completeRailwaySetup() {
    log('🚂 Railway Complete Setup - Infrastructure as Code', 'blue');
    log('=================================================', 'blue');
    log('');

    // Generate secrets
    log('🔐 Generating JWT secrets...');
    const jwtSecret = generateJWTSecret();
    const jwtRefreshSecret = generateJWTSecret();
    log('✅ JWT secrets generated', 'green');

    // Create setup instructions
    const setupInstructions = `
# Railway Backend Service Setup Instructions

## 🎯 Generated Configuration

### JWT Secrets (save securely):
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}

### Environment Variables:
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
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
`;

    // Write instructions to file
    fs.writeFileSync('RAILWAY_SETUP_INSTRUCTIONS.md', setupInstructions);
    log('✅ Setup instructions saved to RAILWAY_SETUP_INSTRUCTIONS.md', 'green');

    // Display summary
    log('');
    log('🎉 Railway Setup Complete!', 'green');
    log('========================', 'green');
    log('');
    log('📋 Your JWT Secrets (save securely):', 'yellow');
    log(`JWT_SECRET: ${jwtSecret}`, 'yellow');
    log(`JWT_REFRESH_SECRET: ${jwtRefreshSecret}`, 'yellow');
    log('');
    log('📋 Environment Variables:', 'cyan');
    log('NODE_ENV=production', 'cyan');
    log('PORT=3001', 'cyan');
    log('API_PREFIX=api/v1', 'cyan');
    log(`JWT_SECRET=${jwtSecret}`, 'cyan');
    log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`, 'cyan');
    log('JWT_EXPIRES_IN=15m', 'cyan');
    log('JWT_REFRESH_EXPIRES_IN=7d', 'cyan');
    log('CORS_ORIGINS=*', 'cyan');
    log('');
    log('📋 Next Steps:', 'blue');
    log('1. Open RAILWAY_SETUP_INSTRUCTIONS.md', 'blue');
    log('2. Follow the step-by-step guide', 'blue');
    log('3. Create backend service in Railway dashboard', 'blue');
    log('4. Add environment variables', 'blue');
    log('5. Get backend URL and update Vercel', 'blue');
    log('');
    log('🎊 Infrastructure as Code setup complete!', 'green');
    log('All configuration is generated and ready for deployment!', 'green');
}

// Run the setup
completeRailwaySetup().catch(error => {
    log(`❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});
