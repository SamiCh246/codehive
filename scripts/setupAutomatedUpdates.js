#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up CodeHive Automated Course Updates...\n');

// Check if required dependencies are installed
async function checkDependencies() {
  console.log('📦 Checking dependencies...');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = ['dotenv'];
  const optionalDeps = ['nodemailer'];
  
  let missingDeps = [];
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log(`❌ Missing required dependencies: ${missingDeps.join(', ')}`);
    console.log('   Install them with: npm install ' + missingDeps.join(' '));
    return false;
  }
  
  console.log('✅ Required dependencies found');
  
  // Check optional dependencies
  for (const dep of optionalDeps) {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      console.log(`⚠️  Optional dependency '${dep}' not found - email notifications will be disabled`);
      console.log(`   Install with: npm install ${dep}`);
    }
  }
  
  return true;
}

// Create necessary directories
function createDirectories() {
  console.log('📁 Creating directories...');
  
  const directories = [
    path.join(__dirname, '..', 'logs'),
    path.join(__dirname, '..', 'config')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   Created: ${dir}`);
    } else {
      console.log(`   Exists: ${dir}`);
    }
  });
  
  console.log('✅ Directories created');
}

// Setup environment configuration
function setupEnvironmentConfig() {
  console.log('⚙️  Setting up environment configuration...');
  
  const envExamplePath = path.join(__dirname, '..', 'config', 'notification.config.example');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Created .env file from template');
      console.log('   Please edit .env with your actual configuration values');
    } else {
      console.log('⚠️  Environment template not found');
    }
  } else {
    console.log('✅ .env file already exists');
  }
}

// Make scripts executable
async function makeScriptsExecutable() {
  console.log('🔧 Making scripts executable...');
  
  const scripts = [
    'automatedCourseUpdate.js',
    'healthCheck.js',
    'setupCronJob.js',
    'notificationService.js'
  ];
  
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      try {
        await execAsync(`chmod +x "${scriptPath}"`);
        console.log(`   Made executable: ${script}`);
      } catch (error) {
        console.log(`   Could not make executable: ${script} (this is OK on Windows)`);
      }
    }
  }
  
  console.log('✅ Scripts configured');
}

// Test the automated update script
async function testUpdateScript() {
  console.log('🧪 Testing automated update script...');
  
  try {
    const { stdout, stderr } = await execAsync(`node "${path.join(__dirname, 'automatedCourseUpdate.js')}" --dry-run`);
    console.log('✅ Update script test passed');
  } catch (error) {
    console.log('⚠️  Update script test failed (this may be normal if Firebase is not configured yet)');
    console.log(`   Error: ${error.message}`);
  }
}

// Setup cron job
async function setupCronJob() {
  console.log('⏰ Setting up cron job...');
  
  try {
    const { stdout, stderr } = await execAsync(`node "${path.join(__dirname, 'setupCronJob.js')}"`);
    console.log(stdout);
  } catch (error) {
    console.log('⚠️  Cron job setup failed:');
    console.log(`   ${error.message}`);
    console.log('   You can set it up manually later');
  }
}

// Create a README for the automation system
function createReadme() {
  console.log('📖 Creating documentation...');
  
  const readmeContent = `# CodeHive Automated Course Updates

This directory contains scripts for automatically updating the course catalog from DePauw University's website.

## Scripts

- \`automatedCourseUpdate.js\` - Main update script that fetches and processes course data
- \`healthCheck.js\` - System health monitoring and validation
- \`setupCronJob.js\` - Sets up weekly automated updates via cron
- \`notificationService.js\` - Handles email/Slack/webhook alerts
- \`setupAutomatedUpdates.js\` - Initial setup script (this file)

## Configuration

1. Copy \`config/notification.config.example\` to \`.env\`
2. Update the \`.env\` file with your Firebase credentials
3. Optionally configure email/Slack notifications

## Usage

### Manual Update
\`\`\`bash
node scripts/automatedCourseUpdate.js
\`\`\`

### Health Check
\`\`\`bash
node scripts/healthCheck.js
\`\`\`

### Test Notifications
\`\`\`bash
node scripts/notificationService.js test
\`\`\`

### Setup Cron Job
\`\`\`bash
node scripts/setupCronJob.js
\`\`\`

## Logs

- Course updates: \`logs/course-updates.log\`
- Health checks: \`logs/health-check.log\`
- Notifications: \`logs/notifications.log\`
- Update status: \`logs/update-status.json\`
- Health status: \`logs/health-status.json\`

## Monitoring

The system automatically:
- Updates courses weekly (Sunday 2:00 AM)
- Runs health checks daily (3:00 AM)
- Sends alerts for failures
- Tracks update history and status

## Troubleshooting

1. Check logs in the \`logs/\` directory
2. Verify Firebase configuration in \`.env\`
3. Test individual scripts manually
4. Check cron job is installed: \`crontab -l\`
`;

  const readmePath = path.join(__dirname, '..', 'AUTOMATION_README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ Created AUTOMATION_README.md');
}

// Main setup function
async function main() {
  try {
    console.log('🔍 Checking system requirements...\n');
    
    // Check if we're in the right directory
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ Error: package.json not found. Please run this script from the project root.');
      process.exit(1);
    }
    
    // Run setup steps
    const depsOk = await checkDependencies();
    if (!depsOk) {
      console.log('\n❌ Setup failed due to missing dependencies');
      process.exit(1);
    }
    
    createDirectories();
    setupEnvironmentConfig();
    await makeScriptsExecutable();
    await testUpdateScript();
    createReadme();
    await setupCronJob();
    
    console.log('\n🎉 Automated course updates setup completed!\n');
    
    console.log('📋 Next steps:');
    console.log('1. Edit .env file with your Firebase credentials');
    console.log('2. Optionally configure email/Slack notifications');
    console.log('3. Test the system: node scripts/automatedCourseUpdate.js');
    console.log('4. Monitor logs in the logs/ directory');
    
    console.log('\n📖 See AUTOMATION_README.md for detailed documentation');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
main();
