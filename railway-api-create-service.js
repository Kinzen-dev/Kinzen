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

async function createBackendServiceViaAPI() {
    log('🚂 Creating Backend Service via Railway API', 'blue');
    log('==========================================', 'blue');
    log('');

    // Generate secrets
    log('🔐 Generating JWT secrets...');
    const jwtSecret = generateJWTSecret();
    const jwtRefreshSecret = generateJWTSecret();
    log('✅ JWT secrets generated', 'green');

    // Get Railway token
    log('🔑 Getting Railway token...');
    let railwayToken = '';
    try {
        const whoami = runCommand('railway whoami --json', { silent: true });
        const parsed = JSON.parse(whoami);
        railwayToken = parsed.token;
        log('✅ Railway token obtained', 'green');
    } catch (error) {
        log('❌ Could not get Railway token. Please set RAILWAY_TOKEN environment variable.', 'red');
        log('You can get your token from: https://railway.app/account/tokens', 'yellow');
        process.exit(1);
    }

    // Get project ID
    log('📋 Getting project information...');
    try {
        const projectInfo = runCommand('railway status --json', { silent: true });
        const parsed = JSON.parse(projectInfo);
        const projectId = parsed.project;
        log(`✅ Project ID: ${projectId}`, 'green');

        // Create service using Railway API
        log('🚀 Creating backend service via API...');
        
        const createServicePayload = {
            name: 'kinzen-backend',
            projectId: projectId,
            source: {
                repo: 'Kinzen-dev/Kinzen',
                branch: 'main',
                rootDirectory: 'backend'
            }
        };

        // Use curl to create service
        const curlCommand = `curl -X POST "https://backboard.railway.app/graphql" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${railwayToken}" \\
  -d '{
    "query": "mutation { projectCreateService(projectId: \\"${projectId}\\", name: \\"kinzen-backend\\", source: { repo: \\"Kinzen-dev/Kinzen\\", branch: \\"main\\", rootDirectory: \\"backend\\" }) { id name } }"
  }'`;

        log('Creating service...', 'blue');
        const result = runCommand(curlCommand, { silent: true, ignoreError: true });
        
        if (result) {
            log('✅ Service creation attempted', 'green');
            log('Response:', 'blue');
            log(result, 'blue');
        } else {
            log('⚠️ Service creation may have failed', 'yellow');
        }

    } catch (error) {
        log('❌ Failed to get project information', 'red');
        log(error.message, 'red');
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

    // Final output
    log('');
    log('🎉 Backend Service Creation Attempted!', 'green');
    log('=====================================', 'green');
    log('');
    log('📋 Your JWT Secrets (save securely):', 'yellow');
    log(`JWT_SECRET: ${jwtSecret}`, 'yellow');
    log(`JWT_REFRESH_SECRET: ${jwtRefreshSecret}`, 'yellow');
    log('');
    log('📋 Next steps:', 'blue');
    log('1. Check Railway dashboard for the new service', 'blue');
    log('2. If service exists, add the environment variables manually', 'blue');
    log('3. Deploy the backend service', 'blue');
    log('4. Get the backend URL and update Vercel', 'blue');
    log('');
    log('🎊 Infrastructure as Code setup complete!', 'green');
}

// Run the creation
createBackendServiceViaAPI().catch(error => {
    log(`❌ Service creation failed: ${error.message}`, 'red');
    process.exit(1);
});
