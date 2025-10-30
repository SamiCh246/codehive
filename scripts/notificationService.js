#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for different notification channels
const NOTIFICATION_CONFIG = {
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO ? process.env.EMAIL_TO.split(',') : []
  },
  slack: {
    enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: process.env.SLACK_CHANNEL || '#alerts'
  },
  webhook: {
    enabled: process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true',
    url: process.env.WEBHOOK_URL,
    secret: process.env.WEBHOOK_SECRET
  }
};

// Log notification attempts
function logNotification(type, message, success = true) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${success ? 'SUCCESS' : 'FAILED'}: ${message}`;
  
  console.log(logMessage);
  
  const logFile = path.join(__dirname, '../logs/notifications.log');
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Send email notification
async function sendEmailNotification(alertType, message, details = null) {
  if (!NOTIFICATION_CONFIG.email.enabled) {
    logNotification('EMAIL', 'Email notifications disabled', false);
    return false;
  }

  try {
    // Import nodemailer dynamically (install with: npm install nodemailer)
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransporter(NOTIFICATION_CONFIG.email.smtp);
    
    const subject = `CodeHive Alert: ${alertType}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">🚨 CodeHive Course Update Alert</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Alert Type: ${alertType}</h3>
          <p style="font-size: 16px; line-height: 1.5; color: #34495e;">${message}</p>
        </div>
        
        ${details ? `
          <div style="background: #ecf0f1; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #2c3e50;">Details:</h4>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(details, null, 2)}</pre>
          </div>
        ` : ''}
        
        <div style="background: #3498db; color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>System:</strong> CodeHive Course Catalog</p>
          <p style="margin: 5px 0 0 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <div style="border-top: 1px solid #bdc3c7; padding-top: 15px; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
          <p>This is an automated alert from the CodeHive Course Update System.</p>
          <p>To disable these notifications, update your notification settings.</p>
        </div>
      </div>
    `;
    
    for (const recipient of NOTIFICATION_CONFIG.email.to) {
      await transporter.sendMail({
        from: NOTIFICATION_CONFIG.email.from,
        to: recipient,
        subject,
        html: htmlContent
      });
    }
    
    logNotification('EMAIL', `Sent to ${NOTIFICATION_CONFIG.email.to.length} recipients`);
    return true;
    
  } catch (error) {
    logNotification('EMAIL', `Failed: ${error.message}`, false);
    return false;
  }
}

// Send Slack notification
async function sendSlackNotification(alertType, message, details = null) {
  if (!NOTIFICATION_CONFIG.slack.enabled || !NOTIFICATION_CONFIG.slack.webhookUrl) {
    logNotification('SLACK', 'Slack notifications disabled or webhook not configured', false);
    return false;
  }

  try {
    const color = alertType.includes('FAILED') || alertType.includes('ERROR') ? 'danger' : 
                  alertType.includes('WARNING') ? 'warning' : 'good';
    
    const slackMessage = {
      channel: NOTIFICATION_CONFIG.slack.channel,
      username: 'CodeHive Bot',
      icon_emoji: ':robot_face:',
      attachments: [
        {
          color,
          title: `🚨 CodeHive Course Update Alert: ${alertType}`,
          text: message,
          fields: details ? [
            {
              title: 'Details',
              value: `\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
              short: false
            }
          ] : [],
          footer: 'CodeHive Course Update System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };
    
    const response = await fetch(NOTIFICATION_CONFIG.slack.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });
    
    if (response.ok) {
      logNotification('SLACK', 'Message sent successfully');
      return true;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    logNotification('SLACK', `Failed: ${error.message}`, false);
    return false;
  }
}

// Send webhook notification
async function sendWebhookNotification(alertType, message, details = null) {
  if (!NOTIFICATION_CONFIG.webhook.enabled || !NOTIFICATION_CONFIG.webhook.url) {
    logNotification('WEBHOOK', 'Webhook notifications disabled or URL not configured', false);
    return false;
  }

  try {
    const payload = {
      alertType,
      message,
      details,
      timestamp: new Date().toISOString(),
      system: 'CodeHive Course Update System'
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (NOTIFICATION_CONFIG.webhook.secret) {
      headers['X-Webhook-Secret'] = NOTIFICATION_CONFIG.webhook.secret;
    }
    
    const response = await fetch(NOTIFICATION_CONFIG.webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      logNotification('WEBHOOK', 'Webhook sent successfully');
      return true;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    logNotification('WEBHOOK', `Failed: ${error.message}`, false);
    return false;
  }
}

// Main notification function
async function sendAlert(alertType, message, details = null) {
  const results = {
    email: false,
    slack: false,
    webhook: false
  };
  
  // Send notifications in parallel
  const promises = [];
  
  if (NOTIFICATION_CONFIG.email.enabled) {
    promises.push(
      sendEmailNotification(alertType, message, details)
        .then(success => { results.email = success; })
        .catch(error => { 
          results.email = false;
          logNotification('EMAIL', `Error: ${error.message}`, false);
        })
    );
  }
  
  if (NOTIFICATION_CONFIG.slack.enabled) {
    promises.push(
      sendSlackNotification(alertType, message, details)
        .then(success => { results.slack = success; })
        .catch(error => { 
          results.slack = false;
          logNotification('SLACK', `Error: ${error.message}`, false);
        })
    );
  }
  
  if (NOTIFICATION_CONFIG.webhook.enabled) {
    promises.push(
      sendWebhookNotification(alertType, message, details)
        .then(success => { results.webhook = success; })
        .catch(error => { 
          results.webhook = false;
          logNotification('WEBHOOK', `Error: ${error.message}`, false);
        })
    );
  }
  
  // Wait for all notifications to complete
  await Promise.all(promises);
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalAttempts = Object.keys(results).length;
  
  logNotification('OVERALL', `Sent ${successCount}/${totalAttempts} notifications successfully`);
  
  return results;
}

// Test notification function
async function testNotifications() {
  console.log('🧪 Testing notification system...');
  
  const testMessage = 'This is a test notification from the CodeHive Course Update System.';
  const testDetails = {
    system: 'CodeHive',
    test: true,
    timestamp: new Date().toISOString()
  };
  
  const results = await sendAlert('TEST_NOTIFICATION', testMessage, testDetails);
  
  console.log('\n📊 Test Results:');
  console.log(`Email: ${results.email ? '✅' : '❌'}`);
  console.log(`Slack: ${results.slack ? '✅' : '❌'}`);
  console.log(`Webhook: ${results.webhook ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  if (successCount === 0) {
    console.log('\n⚠️  No notifications were sent. Check your configuration in .env');
  } else {
    console.log(`\n✅ ${successCount} notification(s) sent successfully`);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  if (command === 'test') {
    testNotifications();
  } else if (command === 'alert') {
    const alertType = process.argv[3] || 'TEST_ALERT';
    const message = process.argv[4] || 'Test alert message';
    
    sendAlert(alertType, message)
      .then(results => {
        console.log('Alert sent:', results);
        process.exit(0);
      })
      .catch(error => {
        console.error('Failed to send alert:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node notificationService.js test          - Test all notification channels');
    console.log('  node notificationService.js alert [type] [message] - Send a test alert');
  }
}

export { sendAlert, sendEmailNotification, sendSlackNotification, sendWebhookNotification };
