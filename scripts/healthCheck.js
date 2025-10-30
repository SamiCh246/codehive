#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDocs, getFirestore, limit, orderBy, query, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HEALTH_LOG_FILE = path.join(__dirname, '../logs/health-check.log');
const UPDATE_STATUS_FILE = path.join(__dirname, '../logs/update-status.json');

// Ensure logs directory exists
const logsDir = path.dirname(HEALTH_LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(HEALTH_LOG_FILE, logMessage + '\n');
}

async function checkFirebaseConnection() {
  try {
    log('Checking Firebase connection...');
    const courseCollection = collection(db, 'courseCatalog');
    const testQuery = query(courseCollection, orderBy('courseCode', 'asc'), limit(1));
    const snapshot = await getDocs(testQuery);
    
    log(`✅ Firebase connection successful. Found ${snapshot.size} courses in test query.`);
    return { status: 'healthy', courses: snapshot.size };
  } catch (error) {
    log(`❌ Firebase connection failed: ${error.message}`, 'ERROR');
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkCourseDataIntegrity() {
  try {
    log('Checking course data integrity...');
    const courseCollection = collection(db, 'courseCatalog');
    const allCoursesQuery = query(courseCollection, orderBy('courseCode', 'asc'));
    const snapshot = await getDocs(allCoursesQuery);
    
    const courses = snapshot.docs.map(doc => doc.data());
    
    // Check for required fields
    const requiredFields = ['courseCode', 'title', 'description', 'credits', 'distributionArea', 'courseLevel'];
    let integrityIssues = [];
    
    courses.forEach((course, index) => {
      requiredFields.forEach(field => {
        if (!course[field]) {
          integrityIssues.push(`Course ${index + 1} (${course.courseCode}) missing ${field}`);
        }
      });
    });
    
    if (integrityIssues.length > 0) {
      log(`⚠️  Found ${integrityIssues.length} data integrity issues:`, 'WARN');
      integrityIssues.forEach(issue => log(`   ${issue}`, 'WARN'));
      return { status: 'warning', issues: integrityIssues.length, totalCourses: courses.length };
    } else {
      log(`✅ Course data integrity check passed. ${courses.length} courses validated.`);
      return { status: 'healthy', totalCourses: courses.length };
    }
    
  } catch (error) {
    log(`❌ Course data integrity check failed: ${error.message}`, 'ERROR');
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkLastUpdateStatus() {
  try {
    if (!fs.existsSync(UPDATE_STATUS_FILE)) {
      log('⚠️  No update status file found - updates may not have run yet', 'WARN');
      return { status: 'unknown', message: 'No update history' };
    }
    
    const statusData = JSON.parse(fs.readFileSync(UPDATE_STATUS_FILE, 'utf8'));
    const lastUpdate = new Date(statusData.lastUpdate);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
    
    log(`Last update: ${lastUpdate.toISOString()} (${daysSinceUpdate} days ago)`);
    log(`Update status: ${statusData.status}`);
    
    if (statusData.status === 'FAILED') {
      log(`❌ Last update failed: ${statusData.error}`, 'ERROR');
      return { status: 'unhealthy', lastUpdate, error: statusData.error };
    } else if (daysSinceUpdate > 7) {
      log(`⚠️  No updates in ${daysSinceUpdate} days - may need attention`, 'WARN');
      return { status: 'warning', lastUpdate, daysSinceUpdate };
    } else {
      log(`✅ Last update was successful and recent (${daysSinceUpdate} days ago)`);
      return { status: 'healthy', lastUpdate, daysSinceUpdate };
    }
    
  } catch (error) {
    log(`❌ Error checking update status: ${error.message}`, 'ERROR');
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkSystemResources() {
  try {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    log(`Memory usage: RSS ${memUsageMB.rss}MB, Heap ${memUsageMB.heapUsed}/${memUsageMB.heapTotal}MB`);
    
    // Check disk space for logs directory
    const stats = fs.statSync(logsDir);
    log(`Logs directory accessible: ${stats.isDirectory()}`);
    
    return { 
      status: 'healthy', 
      memory: memUsageMB,
      logsAccessible: true 
    };
    
  } catch (error) {
    log(`❌ System resource check failed: ${error.message}`, 'ERROR');
    return { status: 'unhealthy', error: error.message };
  }
}

async function performHealthCheck() {
  const startTime = new Date();
  log('🔍 Starting system health check...');
  
  const results = {
    timestamp: startTime.toISOString(),
    checks: {}
  };
  
  // Run all health checks
  results.checks.firebase = await checkFirebaseConnection();
  results.checks.dataIntegrity = await checkCourseDataIntegrity();
  results.checks.updateStatus = await checkLastUpdateStatus();
  results.checks.systemResources = await checkSystemResources();
  
  // Determine overall health
  const allHealthy = Object.values(results.checks).every(check => check.status === 'healthy');
  const hasErrors = Object.values(results.checks).some(check => check.status === 'unhealthy');
  
  let overallStatus;
  if (hasErrors) {
    overallStatus = 'unhealthy';
    log('❌ System health check completed with errors', 'ERROR');
  } else if (allHealthy) {
    overallStatus = 'healthy';
    log('✅ System health check completed successfully');
  } else {
    overallStatus = 'warning';
    log('⚠️  System health check completed with warnings', 'WARN');
  }
  
  results.overallStatus = overallStatus;
  results.duration = Math.round((new Date() - startTime) / 1000);
  
  // Save health check results
  const healthStatusFile = path.join(logsDir, 'health-status.json');
  fs.writeFileSync(healthStatusFile, JSON.stringify(results, null, 2));
  
  // Save to Firebase for frontend access
  try {
    const statusRef = doc(db, 'systemStatus', 'healthCheck');
    await setDoc(statusRef, {
      ...results,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    log(`Health status saved to Firebase: ${overallStatus}`);
  } catch (error) {
    log(`Error saving health status to Firebase: ${error.message}`, 'ERROR');
  }
  
  log(`Health check completed in ${results.duration} seconds with status: ${overallStatus}`);
  
  // Send alerts if unhealthy
  if (overallStatus === 'unhealthy') {
    await sendHealthAlert('SYSTEM_UNHEALTHY', 'System health check failed', results);
  } else if (overallStatus === 'warning') {
    await sendHealthAlert('SYSTEM_WARNING', 'System health check has warnings', results);
  }
  
  return results;
}

async function sendHealthAlert(type, message, details) {
  try {
    // Import and use the notification service
    const { sendAlert: sendNotification } = await import('./notificationService.js');
    const results = await sendNotification(type, message, details);
    
    log(`ALERT [${type}]: ${message}`, 'ALERT');
    log(`Alert details: ${JSON.stringify(details, null, 2)}`, 'ALERT');
    log(`Notification results: ${JSON.stringify(results)}`, 'ALERT');
    
    return results;
  } catch (error) {
    // Fallback to basic logging if notification service fails
    log(`ALERT [${type}]: ${message}`, 'ALERT');
    log(`Alert details: ${JSON.stringify(details, null, 2)}`, 'ALERT');
    log(`Notification service error: ${error.message}`, 'ERROR');
    
    return { error: error.message };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  performHealthCheck()
    .then((results) => {
      console.log('\n📊 Health Check Summary:');
      console.log(`Overall Status: ${results.overallStatus.toUpperCase()}`);
      console.log(`Duration: ${results.duration}s`);
      
      Object.entries(results.checks).forEach(([checkName, result]) => {
        const status = result.status === 'healthy' ? '✅' : 
                      result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${status} ${checkName}: ${result.status}`);
      });
      
      process.exit(results.overallStatus === 'healthy' ? 0 : 1);
    })
    .catch((error) => {
      log(`Health check failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

export { checkCourseDataIntegrity, checkFirebaseConnection, performHealthCheck };

