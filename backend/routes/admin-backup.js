import express from 'express';
import { auth, db } from '../config/firebase.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupDetails,
  cleanupOldBackups,
} from '../services/backup.js';
import { testCloudStorage } from '../services/cloudStorage.js';
import { getBackupSizeStats, getMonitoringConfig, updateMonitoringConfig } from '../services/backupMonitor.js';
import { generateEncryptionKey, validateEncryptionKey, testEncryption } from '../services/backupEncryption.js';
import {
  getBackupConfig,
  updateBackupConfig,
  getBackupStats,
  getBackupAlerts,
  acknowledgeAlert,
  testBackupConfig,
} from '../services/backupConfig.js';
import { reloadScheduledBackups } from '../services/backupSchedule.js';

const router = express.Router();

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Create backup
router.post('/create', verifyAdmin, rateLimiters.adminActions, async (req, res) => {
  try {
    const { collections, compress, uploadToCloud } = req.body;

    console.log('[API] Creating backup...', { collections, compress, uploadToCloud });

    const result = await createBackup({
      collections,
      compress: compress !== false,
      uploadToCloud: uploadToCloud || false,
    });

    res.json({
      message: 'Backup created successfully',
      backup: result,
    });
  } catch (error) {
    console.error('[API] Backup failed:', error.message);
    res.status(500).json({
      error: 'Backup failed',
      details: error.message,
    });
  }
});

// List backups
router.get('/list', verifyAdmin, async (req, res) => {
  try {
    const result = await listBackups();
    
    res.json(result);
  } catch (error) {
    console.error('[API] List backups failed:', error.message);
    res.status(500).json({
      error: 'Failed to list backups',
      details: error.message,
    });
  }
});

// Get backup details
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await getBackupDetails(id);
    
    res.json({ backup: result });
  } catch (error) {
    console.error('[API] Get backup failed:', error.message);
    res.status(404).json({
      error: 'Backup not found',
      details: error.message,
    });
  }
});

// Restore backup
router.post('/:id/restore', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { collections, overwrite, dryRun } = req.body;

    console.log('[API] Restoring backup...', { id, collections, overwrite, dryRun });

    const result = await restoreBackup(id, {
      collections,
      overwrite: overwrite || false,
      dryRun: dryRun || false,
    });

    res.json({
      message: 'Restore completed',
      restore: result,
    });
  } catch (error) {
    console.error('[API] Restore failed:', error.message);
    res.status(500).json({
      error: 'Restore failed',
      details: error.message,
    });
  }
});

// Delete backup
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete from Firestore
    await db.collection('backup_logs').doc(id).delete();
    
    // Delete backup files
    const fs = await import('fs');
    const path = await import('path');
    const backupDir = path.join(process.cwd(), 'backups');
    
    const backupPath = path.join(backupDir, id);
    const compressedPath = path.join(backupDir, `${id}.tar.gz`);
    const metadataPath = path.join(backupDir, `${id}_metadata.json`);
    
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    if (fs.existsSync(compressedPath)) {
      fs.unlinkSync(compressedPath);
    }
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }

    res.json({
      message: 'Backup deleted successfully',
      backup_id: id,
    });
  } catch (error) {
    console.error('[API] Delete backup failed:', error.message);
    res.status(500).json({
      error: 'Failed to delete backup',
      details: error.message,
    });
  }
});

// Cleanup old backups
router.post('/cleanup', verifyAdmin, async (req, res) => {
  try {
    const result = await cleanupOldBackups();
    
    res.json({
      message: 'Cleanup completed',
      result,
    });
  } catch (error) {
    console.error('[API] Cleanup failed:', error.message);
    res.status(500).json({
      error: 'Cleanup failed',
      details: error.message,
    });
  }
});

// Test cloud storage
router.get('/cloud/test', verifyAdmin, async (req, res) => {
  try {
    const result = await testCloudStorage();
    
    res.json(result);
  } catch (error) {
    console.error('[API] Cloud test failed:', error.message);
    res.status(500).json({
      error: 'Cloud storage test failed',
      details: error.message,
    });
  }
});

// Get backup statistics
router.get('/stats/overview', verifyAdmin, async (req, res) => {
  try {
    const backupLogs = await db.collection('backup_logs')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();
    
    const restoreLogs = await db.collection('restore_logs')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    const stats = {
      total_backups: backupLogs.size,
      successful_backups: 0,
      failed_backups: 0,
      total_documents_backed_up: 0,
      total_restores: restoreLogs.size,
      successful_restores: 0,
      failed_restores: 0,
      last_backup: null,
      last_restore: null,
    };

    backupLogs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'completed') {
        stats.successful_backups++;
        stats.total_documents_backed_up += data.total_documents || 0;
        if (!stats.last_backup) {
          stats.last_backup = data.created_at;
        }
      } else {
        stats.failed_backups++;
      }
    });

    restoreLogs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'completed') {
        stats.successful_restores++;
        if (!stats.last_restore) {
          stats.last_restore = data.created_at;
        }
      } else {
        stats.failed_restores++;
      }
    });

    res.json({ stats });
  } catch (error) {
    console.error('[API] Get stats failed:', error.message);
    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message,
    });
  }
});

// Get backup size statistics (monitoring)
router.get('/stats/size', verifyAdmin, async (req, res) => {
  try {
    const stats = await getBackupSizeStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get size stats',
      details: error.message,
    });
  }
});

// Get monitoring config
router.get('/monitoring/config', verifyAdmin, async (req, res) => {
  try {
    const config = getMonitoringConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get monitoring config',
      details: error.message,
    });
  }
});

// Update monitoring config
router.patch('/monitoring/config', verifyAdmin, async (req, res) => {
  try {
    const config = await updateMonitoringConfig(req.body);
    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update monitoring config',
      details: error.message,
    });
  }
});

// Generate encryption key
router.post('/encryption/generate-key', verifyAdmin, async (req, res) => {
  try {
    const key = generateEncryptionKey();
    res.json({
      key,
      message: 'Save this key securely! It cannot be recovered.',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate encryption key',
      details: error.message,
    });
  }
});

// Validate encryption key
router.post('/encryption/validate-key', verifyAdmin, async (req, res) => {
  try {
    const { key } = req.body;
    const result = validateEncryptionKey(key);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate encryption key',
      details: error.message,
    });
  }
});

// Test encryption
router.post('/encryption/test', verifyAdmin, async (req, res) => {
  try {
    const result = await testEncryption();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test encryption',
      details: error.message,
    });
  }
});

// Get retention policy
router.get('/retention', verifyAdmin, async (req, res) => {
  try {
    const { BACKUP_CONFIG } = await import('../services/backup.js');
    res.json({
      retention: BACKUP_CONFIG.retention,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get retention policy',
      details: error.message,
    });
  }
});

// ==================== BACKUP CONFIGURATION (FIRESTORE) ====================

// Get full backup config
router.get('/config', verifyAdmin, async (req, res) => {
  try {
    const config = await getBackupConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get backup config',
      details: error.message,
    });
  }
});

// Update backup config
router.patch('/config', verifyAdmin, async (req, res) => {
  try {
    const { reload } = req.body;
    const config = await updateBackupConfig(req.body);
    
    // Reload scheduled backups if requested
    if (reload) {
      await reloadScheduledBackups();
    }
    
    res.json({
      message: 'Backup configuration updated',
      config,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update backup config',
      details: error.message,
    });
  }
});

// Get backup stats
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const stats = await getBackupStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get backup stats',
      details: error.message,
    });
  }
});

// Get backup alerts
router.get('/alerts', verifyAdmin, async (req, res) => {
  try {
    const { limit, status } = req.query;
    const result = await getBackupAlerts({
      limit: parseInt(limit) || 50,
      status,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get backup alerts',
      details: error.message,
    });
  }
});

// Acknowledge alert
router.patch('/alerts/:id/acknowledge', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.uid;
    
    const result = await acknowledgeAlert(id, adminId, notes);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      details: error.message,
    });
  }
});

// Test backup configuration
router.post('/test', verifyAdmin, async (req, res) => {
  try {
    const result = await testBackupConfig();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test backup config',
      details: error.message,
    });
  }
});

// Reload backup schedules
router.post('/reload-schedules', verifyAdmin, async (req, res) => {
  try {
    await reloadScheduledBackups();
    res.json({
      message: 'Backup schedules reloaded successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reload schedules',
      details: error.message,
    });
  }
});

export default router;
