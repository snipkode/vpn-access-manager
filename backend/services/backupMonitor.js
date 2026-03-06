import { db } from '../config/firebase.js';
import { emailNotifications } from './email.js';

// Monitoring configuration
const MONITORING_CONFIG = {
  // Alert if backup size increases by more than X% compared to average
  sizeIncreaseThreshold: 50, // 50%
  
  // Alert if backup size exceeds absolute threshold (in MB)
  maxBackupSize: 500, // 500 MB
  
  // Alert if backup takes longer than X minutes
  maxBackupDuration: 30, // 30 minutes
  
  // Alert if backup fails
  alertOnFailure: true,
  
  // Number of backups to compare for average
  averageBackupsCount: 7,
  
  // Notification channels
  notifyEmail: true,
  notifyWhatsApp: false,
  notifyTelegram: false,
};

// Get backup size statistics
export async function getBackupSizeStats() {
  const snapshot = await db.collection('backup_logs')
    .where('status', '==', 'completed')
    .orderBy('created_at', 'desc')
    .limit(MONITORING_CONFIG.averageBackupsCount)
    .get();

  const sizes = [];
  let totalSize = 0;
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const size = data.compressed_size || data.total_size || 0;
    sizes.push({
      id: doc.id,
      size,
      date: data.created_at,
      documents: data.total_documents,
    });
    totalSize += size;
    count++;
  });

  const avgSize = count > 0 ? totalSize / count : 0;

  return {
    backups: sizes,
    average_size: avgSize,
    average_size_mb: avgSize / (1024 * 1024),
    total_backups: count,
  };
}

// Analyze backup for anomalies
export async function analyzeBackup(backupData) {
  const alerts = [];
  const warnings = [];

  // Get historical data
  const stats = await getBackupSizeStats();
  
  const currentSize = backupData.compressed_size || backupData.total_size || 0;
  const currentSizeMB = currentSize / (1024 * 1024);

  // Check 1: Size exceeds absolute threshold
  if (currentSizeMB > MONITORING_CONFIG.maxBackupSize) {
    alerts.push({
      type: 'SIZE_EXCEEDED',
      severity: 'high',
      message: `Backup size (${currentSizeMB.toFixed(2)} MB) exceeds maximum threshold (${MONITORING_CONFIG.maxBackupSize} MB)`,
      current: currentSizeMB,
      threshold: MONITORING_CONFIG.maxBackupSize,
    });
  }

  // Check 2: Size increased significantly from average
  if (stats.average_size > 0) {
    const increasePercent = ((currentSize - stats.average_size) / stats.average_size) * 100;
    
    if (increasePercent > MONITORING_CONFIG.sizeIncreaseThreshold) {
      warnings.push({
        type: 'SIZE_INCREASE',
        severity: 'medium',
        message: `Backup size increased by ${increasePercent.toFixed(1)}% compared to average`,
        current: currentSizeMB,
        average: stats.average_size_mb,
        increase_percent: increasePercent,
      });
    }
  }

  // Check 3: Backup duration
  if (backupData.started_at && backupData.completed_at) {
    const durationMs = new Date(backupData.completed_at) - new Date(backupData.started_at);
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes > MONITORING_CONFIG.maxBackupDuration) {
      warnings.push({
        type: 'DURATION_EXCEEDED',
        severity: 'medium',
        message: `Backup took ${durationMinutes.toFixed(1)} minutes (threshold: ${MONITORING_CONFIG.maxBackupDuration} minutes)`,
        duration_minutes: durationMinutes,
        threshold: MONITORING_CONFIG.maxBackupDuration,
      });
    }
  }

  // Check 4: Document count anomaly
  if (stats.average_size > 0) {
    const docCount = backupData.total_documents || 0;
    const avgDocs = stats.backups.reduce((sum, b) => sum + (b.documents || 0), 0) / stats.backups.length;
    
    if (avgDocs > 0) {
      const docChangePercent = ((docCount - avgDocs) / avgDocs) * 100;
      
      if (Math.abs(docChangePercent) > 30) {
        warnings.push({
          type: 'DOCUMENT_COUNT_CHANGE',
          severity: 'low',
          message: `Document count changed by ${docChangePercent.toFixed(1)}%`,
          current: docCount,
          average: Math.round(avgDocs),
          change_percent: docChangePercent,
        });
      }
    }
  }

  return {
    backup_id: backupData.backup_id,
    analyzed_at: new Date().toISOString(),
    alerts,
    warnings,
    stats: {
      size_mb: currentSizeMB,
      avg_size_mb: stats.average_size_mb,
      documents: backupData.total_documents,
    },
    has_issues: alerts.length > 0 || warnings.length > 0,
  };
}

// Send alert notification
export async function sendBackupAlert(analysis) {
  const adminEmail = process.env.SMTP_NOTIFICATION_EMAIL || process.env.SMTP_USER;
  
  if (!adminEmail) {
    console.log('[Monitor] No admin email configured, skipping alert');
    return;
  }

  const subject = `🚨 Backup Alert: ${analysis.alerts.length} Issues Detected`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .alert-box { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
        .warning-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
        .stats-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .stat-label { font-weight: bold; color: #6B7280; }
        .stat-value { color: #111827; }
        .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 Backup Alert</h2>
          <p>Issues detected in backup: ${analysis.backup_id}</p>
        </div>
        <div class="content">
          ${analysis.alerts.map(alert => `
            <div class="alert-box">
              <strong>[${alert.severity.toUpperCase()}] ${alert.type}</strong>
              <p>${alert.message}</p>
            </div>
          `).join('')}

          ${analysis.warnings.map(warning => `
            <div class="warning-box">
              <strong>[${warning.severity.toUpperCase()}] ${warning.type}</strong>
              <p>${warning.message}</p>
            </div>
          `).join('')}

          <div class="stats-box">
            <h3>Backup Statistics</h3>
            <div class="stat-row">
              <span class="stat-label">Current Size:</span>
              <span class="value">${analysis.stats.size_mb.toFixed(2)} MB</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Average Size:</span>
              <span class="value">${analysis.stats.avg_size_mb.toFixed(2)} MB</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Documents:</span>
              <span class="value">${analysis.stats.documents}</span>
            </div>
          </div>

          <p style="margin-top: 20px;">
            <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000'}/admin/backups" 
               style="display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Backup Details
            </a>
          </p>
        </div>
        <div class="footer">
          <p>VPN Access System - Automated Backup Monitoring</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (MONITORING_CONFIG.notifyEmail) {
    try {
      await emailNotifications.sendEmail(adminEmail, subject, html);
      console.log('[Monitor] Alert email sent to', adminEmail);
    } catch (error) {
      console.error('[Monitor] Failed to send alert email:', error.message);
    }
  }

  // Log alert to Firestore
  await db.collection('backup_alerts').doc().set({
    backup_id: analysis.backup_id,
    alerts: analysis.alerts,
    warnings: analysis.warnings,
    stats: analysis.stats,
    notified: true,
    notified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
}

// Monitor backup and send alerts if needed
export async function monitorBackup(backupData) {
  console.log('[Monitor] Analyzing backup:', backupData.backup_id);
  
  const analysis = await analyzeBackup(backupData);
  
  if (analysis.has_issues) {
    console.log(`[Monitor] Found ${analysis.alerts.length} alerts, ${analysis.warnings.length} warnings`);
    
    // Send alert for high severity issues
    if (analysis.alerts.length > 0) {
      await sendBackupAlert(analysis);
    }
    
    // Log to Firestore
    await db.collection('backup_monitoring').doc(backupData.backup_id).set({
      ...analysis,
      created_at: new Date().toISOString(),
    });
  } else {
    console.log('[Monitor] No issues detected');
  }
  
  return analysis;
}

// Get monitoring configuration
export function getMonitoringConfig() {
  return MONITORING_CONFIG;
}

// Update monitoring configuration (from Firestore)
export async function updateMonitoringConfig(newConfig) {
  const allowedFields = [
    'sizeIncreaseThreshold',
    'maxBackupSize',
    'maxBackupDuration',
    'alertOnFailure',
    'averageBackupsCount',
    'notifyEmail',
    'notifyWhatsApp',
    'notifyTelegram',
  ];

  const updateData = {};
  allowedFields.forEach(field => {
    if (newConfig[field] !== undefined) {
      updateData[field] = newConfig[field];
    }
  });

  await db.collection('backup_settings').doc('monitoring').set(updateData, { merge: true });
  
  // Update local config
  Object.assign(MONITORING_CONFIG, updateData);
  
  return MONITORING_CONFIG;
}

export default {
  monitorBackup,
  analyzeBackup,
  sendBackupAlert,
  getBackupSizeStats,
  getMonitoringConfig,
  updateMonitoringConfig,
  MONITORING_CONFIG,
};
