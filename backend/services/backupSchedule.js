import cron from 'node-cron';
import { createBackup, cleanupOldBackups } from './backup.js';
import { getBackupConfig } from './backupConfig.js';
import { db } from '../config/firebase.js';

let backupJob = null;
let cleanupJob = null;
let currentConfig = null;

// Initialize scheduled backups
export async function initializeScheduledBackups() {
  const config = await getBackupConfig();
  currentConfig = config;
  
  if (!config.enabled) {
    console.log('[Backup] Automatic backups disabled in Firestore config');
    return null;
  }

  console.log(`[Backup] Scheduling automatic backup: ${config.schedule}`);
  console.log(`  Compress: ${config.compress}`);
  console.log(`  Encrypt: ${config.encrypt}`);
  console.log(`  Upload to Cloud: ${config.upload_to_cloud}`);
  console.log(`  Retention: Daily(${config.retention.daily}), Weekly(${config.retention.weekly}), Monthly(${config.retention.monthly})`);

  backupJob = cron.schedule(config.schedule, async () => {
    console.log('[Backup] Running scheduled backup...');
    
    try {
      const result = await createBackup({
        collections: config.collections,
        compress: config.compress,
        encrypt: config.encrypt,
        uploadToCloud: config.upload_to_cloud,
      });
      
      console.log('[Backup] Scheduled backup completed:', result.backup_id);
    } catch (error) {
      console.error('[Backup] Scheduled backup failed:', error.message);
      
      // Log failure
      await db.collection('backup_logs').doc().set({
        type: 'scheduled',
        status: 'failed',
        error: error.message,
        created_at: new Date().toISOString(),
      });
    }
  });

  return backupJob;
}

// Initialize scheduled cleanup
export async function initializeScheduledCleanup() {
  const config = await getBackupConfig();
  const cleanupSchedule = config.cleanup_schedule || '0 3 * * 0';
  
  console.log(`[Backup] Scheduling cleanup: ${cleanupSchedule}`);

  cleanupJob = cron.schedule(cleanupSchedule, async () => {
    console.log('[Backup] Running scheduled cleanup...');
    
    try {
      const result = await cleanupOldBackups();
      console.log('[Backup] Cleanup completed:', result);
    } catch (error) {
      console.error('[Backup] Cleanup failed:', error.message);
    }
  });

  return cleanupJob;
}

// Reload scheduled backups (for dynamic config updates)
export async function reloadScheduledBackups() {
  console.log('[Backup] Reloading scheduled backups...');
  
  // Stop existing jobs
  if (backupJob) backupJob.stop();
  if (cleanupJob) cleanupJob.stop();
  
  // Reinitialize
  await initializeScheduledBackups();
  await initializeScheduledCleanup();
  
  console.log('[Backup] Scheduled backups reloaded');
}

// Stop scheduled backups
export function stopScheduledBackups() {
  if (backupJob) {
    backupJob.stop();
    console.log('[Backup] Scheduled backups stopped');
  }
  if (cleanupJob) {
    cleanupJob.stop();
  }
}

export default {
  initializeScheduledBackups,
  initializeScheduledCleanup,
  reloadScheduledBackups,
  stopScheduledBackups,
};
