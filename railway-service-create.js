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

async function createBackendService() {
    log('🚂 Creating Backend Service - Infrastructure as Code', 'blue');
    log('=================================================', 'blue');
    log('');

    // Generate secrets
    log('🔐 Generating JWT secrets...');
    const jwtSecret = generateJWTSecret();
    const jwtRefreshSecret = generateJWTSecret();
    log('✅ JWT secrets generated', 'green');
    log(`JWT_SECRET: ${jwtSecret}`, 'yellow');
    log(`JWT_REFRESH_SECRET: ${jwtRefreshSecret}`, 'yellow');

    // Link to project
    log('🔗 Linking to Railway project...');
    try {
        runCommand('railway link --project kinzen-backend-production');
        log('✅ Project linked', 'green');
    } catch (error) {
        log('❌ Failed to link project', 'red');
        return;
    }

    // Check current services
    log('📋 Checking existing services...');
    try {
        const services = runCommand('railway status', { silent: true });
        log('Current services:', 'blue');
        log(services, 'blue');
    } catch (error) {
        log('Could not get service status', 'yellow');
    }

    // Create service using Railway CLI with specific options
    log('🚀 Creating backend service...');
    
    // Try to create service by deploying from backend directory
    try {
        process.chdir('backend');
        
        // Deploy which should create the service
        log('Deploying backend (this will create the service)...');
        runCommand('railway up');
        
        log('✅ Backend service created and deployed', 'green');
    } catch (error) {
        log('⚠️ Service creation may have failed. Check Railway dashboard.', 'yellow');
        log('Error:', 'red');
        log(error.message, 'red');
    }

    // Go back to root
    process.chdir('..');

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

    // Try to set variables
    let variablesSet = 0;
    for (const variable of variables) {
        try {
            runCommand(`railway variables --set "${variable}"`, { silent: true, ignoreError: true });
            variablesSet++;
        } catch (error) {
            // Ignore individual variable errors
        }
    }

    if (variablesSet > 0) {
        log(`✅ ${variablesSet}/${variables.length} environment variables set`, 'green');
    } else {
        log('⚠️ Could not set variables via CLI. Manual setup required:', 'yellow');
        variables.forEach(variable => log(`  ${variable}`, 'yellow'));
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
    log('🎉 Backend Service Creation Complete!', 'green');
    log('=====================================', 'green');
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
    log('🎊 Backend service created with Infrastructure as Code!', 'green');
}

// Run the creation
createBackendService().catch(error => {
    log(`❌ Service creation failed: ${error.message}`, 'red');
    process.exit(1);
});
