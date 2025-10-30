# CodeHive Automated Course Updates

This directory contains scripts for automatically updating the course catalog from DePauw University's website.

## Scripts

- `automatedCourseUpdate.js` - Main update script that fetches and processes course data
- `healthCheck.js` - System health monitoring and validation
- `setupCronJob.js` - Sets up weekly automated updates via cron
- `notificationService.js` - Handles email/Slack/webhook alerts
- `setupAutomatedUpdates.js` - Initial setup script (this file)

## Configuration

1. Copy `config/notification.config.example` to `.env`
2. Update the `.env` file with your Firebase credentials
3. Optionally configure email/Slack notifications

## Usage

### Manual Update
```bash
node scripts/automatedCourseUpdate.js
```

### Health Check
```bash
node scripts/healthCheck.js
```

### Test Notifications
```bash
node scripts/notificationService.js test
```

### Setup Cron Job
```bash
node scripts/setupCronJob.js
```

## Logs

- Course updates: `logs/course-updates.log`
- Health checks: `logs/health-check.log`
- Notifications: `logs/notifications.log`
- Update status: `logs/update-status.json`
- Health status: `logs/health-status.json`

## Monitoring

The system automatically:
- Updates courses weekly (Sunday 2:00 AM)
- Runs health checks daily (3:00 AM)
- Sends alerts for failures
- Tracks update history and status

## Troubleshooting

1. Check logs in the `logs/` directory
2. Verify Firebase configuration in `.env`
3. Test individual scripts manually
4. Check cron job is installed: `crontab -l`
