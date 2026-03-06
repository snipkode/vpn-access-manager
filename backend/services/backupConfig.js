import { db } from '../config/firebase.js';

// Default backup configuration
const DEFAULT_BACKUP_CONFIG = {
  // Backup schedule
  enabled: true,
  schedule: '0 2 * * *',  // Daily at 2:00 AM
  
  // What to backup
  collections: [
    'users',
    'devices',
    'payments',
    'credit_transactions',
    'user_credits',
    'fraud_alerts',
    'fraud_log',
    'bank_accounts',
    'payment_settings',
    'email_settings',
    'cron_settings',
    'fraud_config',
    'user_preferences',
    'audit_logs',
  ],
  
  // Compression
  compress: true,
  
  // Encryption
  encrypt: false,
  encryption_key: null,  // Store in secure vault, not here
  
  // Cloud upload
  upload_to_cloud: false,
  cloud_provider: 'gcs',  // 'gcs' or 's3'
  
  // Retention policy
  retention: {
    daily: 7,
    weekly: 4,
    monthly: 12,
  },
  
  // Monitoring
  monitoring: {
    enabled: true,
    size_increase_threshold: 50,  // 50%
    max_backup_size: 500,  // MB
    max_backup_duration: 30,  // minutes
    notify_email: true,
    notify_whatsapp: false,
    notify_telegram: false,
  },
  
  // Cleanup schedule
  cleanup_schedule: '0 3 * * 0',  // Weekly Sunday 3:00 AM
};

// Get backup configuration from Firestore
export async function getBackupConfig() {
  try {
    const configDoc = await db.collection('backup_settings').doc('config').get();
    
    if (configDoc.exists) {
      const firestoreConfig = configDoc.data();
      console.log('[Backup Config] Using Firestore configuration');
      
      // Merge with defaults for any missing fields
      return {
        ...DEFAULT_BACKUP_CONFIG,
        ...firestoreConfig,
        retention: {
          ...DEFAULT_BACKUP_CONFIG.retention,
          ...(firestoreConfig.retention || {}),
        },
        monitoring: {
          ...DEFAULT_BACKUP_CONFIG.monitoring,
          ...(firestoreConfig.monitoring || {}),
        },
      };
    }
  } catch (error) {
    console.log('[Backup Config] Firestore not available, using defaults');
  }
  
  console.log('[Backup Config] Using default configuration');
  return DEFAULT_BACKUP_CONFIG;
}

// Update backup configuration
export async function updateBackupConfig(newConfig) {
  const configRef = db.collection('backup_settings').doc('config');
  const configDoc = await configRef.get();
  
  const allowedFields = [
    'enabled',
    'schedule',
    'collections',
    'compress',
    'encrypt',
    'upload_to_cloud',
    'cloud_provider',
    'retention',
    'monitoring',
    'cleanup_schedule',
  ];
  
  const updateData = {
    updated_at: new Date().toISOString(),
  };
  
  allowedFields.forEach(field => {
    if (newConfig[field] !== undefined) {
      if (field === 'retention' || field === 'monitoring') {
        // Merge nested objects
        updateData[field] = {
          ...(configDoc.exists ? configDoc.data()[field] : {}),
          ...newConfig[field],
        };
      } else {
        updateData[field] = newConfig[field];
      }
    }
  });
  
  if (!configDoc.exists) {
    updateData.created_at = new Date().toISOString();
    await configRef.set(updateData);
  } else {
    await configRef.update(updateData);
  }
  
  return await getBackupConfig();
}

// Get backup statistics
export async function getBackupStats() {
  const backupLogs = await db.collection('backup_logs')
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();
  
  const stats = {
    total_backups: 0,
    successful: 0,
    failed: 0,
    total_documents: 0,
    total_size: 0,
    encrypted_count: 0,
    cloud_uploaded_count: 0,
    last_backup: null,
    next_scheduled: null,
  };
  
  backupLogs.forEach(doc => {
    const data = doc.data();
    stats.total_backups++;
    
    if (data.status === 'completed') {
      stats.successful++;
      stats.total_documents += data.total_documents || 0;
      stats.total_size += data.compressed_size || data.total_size || 0;
      
      if (data.encrypted) stats.encrypted_count++;
      if (data.cloud_upload === 'success') stats.cloud_uploaded_count++;
      
      if (!stats.last_backup) {
        stats.last_backup = data.created_at;
      }
    } else {
      stats.failed++;
    }
  });
  
  // Get next scheduled backup
  const config = await getBackupConfig();
  if (config.enabled) {
    stats.next_scheduled = getNextSchedule(config.schedule);
  }
  
  return {
    ...stats,
    total_size_mb: (stats.total_size / (1024 * 1024)).toFixed(2),
  };
}

// Calculate next schedule from cron expression
function getNextSchedule(cronExpression) {
  // Simple implementation - in production use node-cron-parser
  const now = new Date();
  
  if (cronExpression === '0 2 * * *') {
    // Daily at 2:00 AM
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(2, 0, 0, 0);
    return next.toISOString();
  }
  
  return null;
}

// Get backup alerts
export async function getBackupAlerts(options = {}) {
  const { limit = 50, status } = options;
  
  let query = db.collection('backup_alerts')
    .orderBy('created_at', 'desc')
    .limit(limit);
  
  if (status) {
    query = query.where('status', '==', status);
  }
  
  const snapshot = await query.get();
  
  const alerts = [];
  snapshot.forEach(doc => {
    alerts.push({
      id: doc.id,
      ...doc.data(),
    });
  });
  
  return { alerts };
}

// Acknowledge backup alert
export async function acknowledgeAlert(alertId, adminId, notes = '') {
  const alertRef = db.collection('backup_alerts').doc(alertId);
  
  await alertRef.update({
    acknowledged: true,
    acknowledged_by: adminId,
    acknowledged_at: new Date().toISOString(),
    admin_notes: notes,
    status: 'acknowledged',
  });
  
  return { success: true };
}

// Test backup configuration
export async function testBackupConfig() {
  const results = {
    firestore: false,
    backup_directory: false,
    encryption: false,
    cloud: false,
    errors: [],
  };
  
  // Test Firestore connection
  try {
    await db.collection('backup_settings').doc('test').set({
      test: true,
      created_at: new Date().toISOString(),
    }, { merge: true });
    await db.collection('backup_settings').doc('test').delete();
    results.firestore = true;
  } catch (error) {
    results.errors.push(`Firestore: ${error.message}`);
  }
  
  // Test backup directory
  try {
    const fs = await import('fs');
    const path = await import('path');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Test write
    const testFile = path.join(backupDir, '.test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    results.backup_directory = true;
  } catch (error) {
    results.errors.push(`Backup Directory: ${error.message}`);
  }
  
  // Test encryption (if enabled)
  const config = await getBackupConfig();
  if (config.encrypt) {
    try {
      const { validateEncryptionKey } = await import('./backupEncryption.js');
      const result = validateEncryptionKey(config.encryption_key);
      results.encryption = result.valid;
      
      if (!result.valid) {
        results.errors.push(`Encryption: ${result.error}`);
      }
    } catch (error) {
      results.errors.push(`Encryption: ${error.message}`);
    }
  } else {
    results.encryption = 'disabled';
  }
  
  // Test cloud storage (if enabled)
  if (config.upload_to_cloud) {
    try {
      const { testCloudStorage } = await import('./cloudStorage.js');
      const cloudResult = await testCloudStorage();
      results.cloud = cloudResult.success;
      
      if (!cloudResult.success) {
        results.errors.push(`Cloud Storage: ${cloudResult.message}`);
      }
    } catch (error) {
      results.errors.push(`Cloud Storage: ${error.message}`);
    }
  } else {
    results.cloud = 'disabled';
  }
  
  return {
    all_ok: results.firestore && results.backup_directory && 
            (results.encryption === true || results.encryption === 'disabled') &&
            (results.cloud === true || results.cloud === 'disabled'),
    results,
  };
}

export default {
  getBackupConfig,
  updateBackupConfig,
  getBackupStats,
  getBackupAlerts,
  acknowledgeAlert,
  testBackupConfig,
  DEFAULT_BACKUP_CONFIG,
};
