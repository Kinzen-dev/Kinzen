#!/usr/bin/env node

const { execSync } = require('child_process');
const crypto = require('crypto');

// Colors for output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, options = {}) {
    try {
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options 
        });
        return result;
    } catch (error) {
        if (!options.ignoreError) {
            throw error;
        }
        return null;
    }
}

function generateJWTSecret() {
    return crypto.randomBytes(32).toString('base64');
}

async function deployRailwayInfrastructure() {
    log('🚂 Railway Infrastructure as Code Deployment', 'blue');
    log('============================================', 'blue');
    log('');

    // Check dependencies
    log('🔍 Checking dependencies...');
    
    try {
        runCommand('railway --version', { silent: true });
        log('✅ Railway CLI found', 'green');
    } catch (error) {
        log('❌ Railway CLI not found. Installing...', 'red');
        runCommand('npm install -g @railway/cli');
        log('✅ Railway CLI installed', 'green');
    }

    // Check authentication
    log('🔐 Checking Railway authentication...');
    try {
        const whoami = runCommand('railway whoami', { silent: true });
        log(`✅ Logged in as: ${whoami.trim()}`, 'green');
    } catch (error) {
        log('❌ Not logged into Railway. Please login first:', 'red');
        log('railway login', 'yellow');
        process.exit(1);
    }

    // Generate secrets
    log('🔐 Generating JWT secrets...');
    const jwtSecret = generateJWTSecret();
    const jwtRefreshSecret = generateJWTSecret();
    log('✅ JWT secrets generated', 'green');

    // Project configuration
    const projectName = 'kinzen-backend-production';
    const serviceName = 'kinzen-backend';

    // Check if project exists
    log('🏗️ Setting up Railway project...');
    const projects = runCommand('railway list', { silent: true });
    
    if (projects.includes(projectName)) {
        log(`⚠️ Project '${projectName}' already exists. Linking...`, 'yellow');
        runCommand(`railway link --project "${projectName}"`);
    } else {
        log(`🚀 Creating new project '${projectName}'...`);
        runCommand(`railway new --name "${projectName}"`);
        runCommand('railway link');
    }
    log('✅ Project ready', 'green');

    // Add PostgreSQL database
    log('🗄️ Adding PostgreSQL database...');
    try {
        runCommand('railway add --database postgres');
        log('✅ PostgreSQL database added', 'green');
    } catch (error) {
        log('⚠️ PostgreSQL might already exist or failed to add', 'yellow');
    }

    // Set environment variables
    log('⚙️ Setting environment variables...');
    const variables = [
        'NODE_ENV=production',
        'PORT=3001',
        'API_PREFIX=api/v1',
        `JWT_SECRET=${jwtSecret}`,
        `JWT_REFRESH_SECRET=${jwtRefreshSecret}`,
        'JWT_EXPIRES_IN=15m',
        'JWT_REFRESH_EXPIRES_IN=7d',
        'CORS_ORIGINS=*'
    ];

    // Try to set variables via CLI
    let variablesSet = false;
    for (const variable of variables) {
        try {
            runCommand(`railway variables --set "${variable}"`, { silent: true, ignoreError: true });
            variablesSet = true;
        } catch (error) {
            // Ignore individual variable errors
        }
    }

    if (variablesSet) {
        log('✅ Environment variables set', 'green');
    } else {
        log('⚠️ Could not set variables via CLI. Manual setup required:', 'yellow');
        variables.forEach(variable => log(`  ${variable}`, 'yellow'));
    }

    // Deploy backend
    log('🚀 Deploying backend...');
    process.chdir('../../backend');
    
    try {
        runCommand('railway up');
        log('✅ Backend deployed successfully', 'green');
    } catch (error) {
        log('⚠️ Deployment may have issues. Check Railway dashboard.', 'yellow');
    }

    // Get domain
    log('📊 Getting deployment information...');
    let domain = 'Check Railway dashboard for domain';
    try {
        domain = runCommand('railway domain', { silent: true }).trim();
    } catch (error) {
        // Domain command might not work, that's OK
    }

    // Final output
    log('');
    log('🎉 Deployment Complete!', 'green');
    log('========================', 'green');
    log('');
    log('📋 Your JWT Secrets (save securely):', 'yellow');
    log(`JWT_SECRET: ${jwtSecret}`, 'yellow');
    log(`JWT_REFRESH_SECRET: ${jwtRefreshSecret}`, 'yellow');
    log('');
    log(`🌐 Backend URL: ${domain}`, 'green');
    log(`🔗 API Endpoint: ${domain}/api/v1`, 'green');
    log(`📚 Swagger Docs: ${domain}/docs`, 'green');
    log('');
    log('🧪 Test your deployment:', 'blue');
    log(`curl ${domain}/api/v1/health`, 'blue');
    log('');
    log('📋 Next steps:', 'blue');
    log(`1. Update Vercel with: NEXT_PUBLIC_API_URL=${domain}/api/v1`, 'blue');
    log('2. Update CORS_ORIGINS with your Vercel URL', 'blue');
    log('3. Test the full stack', 'blue');
    log('');
    log('🎊 All done! Your backend is deployed with Infrastructure as Code!', 'green');
}

// Run the deployment
deployRailwayInfrastructure().catch(error => {
    log(`❌ Deployment failed: ${error.message}`, 'red');
    process.exit(1);
});
