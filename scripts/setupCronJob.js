#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.join(__dirname, '..');
const scriptPath = path.join(__dirname, 'automatedCourseUpdate.js');

console.log('🔧 Setting up automated course updates...');

// Create the cron job entry
const cronJob = `# Weekly automated course updates for CodeHive
# Runs every Sunday at 2:00 AM
0 2 * * 0 cd ${projectRoot} && node ${scriptPath} >> ${projectRoot}/logs/course-updates.log 2>&1

# Optional: Daily health check (runs at 3:00 AM)
0 3 * * * cd ${projectRoot} && node ${path.join(__dirname, 'healthCheck.js')} >> ${projectRoot}/logs/health-check.log 2>&1
`;

// Create logs directory if it doesn't exist
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
}

// Create a temporary cron file
const tempCronFile = path.join(projectRoot, 'temp_cron');
fs.writeFileSync(tempCronFile, cronJob);

try {
  // Get current crontab
  const { stdout: currentCron } = await execAsync('crontab -l 2>/dev/null || echo ""');
  
  // Check if our cron job already exists
  if (currentCron.includes('automatedCourseUpdate.js')) {
    console.log('⚠️  Cron job already exists for course updates');
    console.log('   To update it, please remove the existing entry first:');
    console.log('   crontab -e');
  } else {
    // Add our cron job to the existing crontab
    const newCron = currentCron + '\n' + cronJob;
    fs.writeFileSync(tempCronFile, newCron);
    
    // Install the new crontab
    await execAsync(`crontab ${tempCronFile}`);
    
    console.log('✅ Cron job installed successfully!');
    console.log('📅 Course updates will run every Sunday at 2:00 AM');
    console.log('📊 Health checks will run daily at 3:00 AM');
  }
  
} catch (error) {
  console.error('❌ Error setting up cron job:', error.message);
  console.log('\n🔧 Manual setup instructions:');
  console.log('1. Run: crontab -e');
  console.log('2. Add this line:');
  console.log(`   0 2 * * 0 cd ${projectRoot} && node ${scriptPath} >> ${projectRoot}/logs/course-updates.log 2>&1`);
  console.log('3. Save and exit');
} finally {
  // Clean up temporary file
  if (fs.existsSync(tempCronFile)) {
    fs.unlinkSync(tempCronFile);
  }
}

// Display current crontab
try {
  const { stdout: currentCron } = await execAsync('crontab -l');
  console.log('\n📋 Current crontab:');
  console.log(currentCron);
} catch (error) {
  console.log('\n📋 No crontab entries found');
}

console.log('\n📝 Log files will be created in:');
console.log(`   ${path.join(projectRoot, 'logs/course-updates.log')}`);
console.log(`   ${path.join(projectRoot, 'logs/update-status.json')}`);
console.log(`   ${path.join(projectRoot, 'logs/health-check.log')}`);

console.log('\n🔍 To monitor the updates:');
console.log(`   tail -f ${path.join(projectRoot, 'logs/course-updates.log')}`);
console.log(`   cat ${path.join(projectRoot, 'logs/update-status.json')}`);
