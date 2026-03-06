import { db } from '../config/firebase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { monitorBackup } from './backupMonitor.js';
import { encryptBackup, decryptBackup } from './backupEncryption.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const backupDir = path.join(rootDir, 'backups');

// Backup configuration
const BACKUP_CONFIG = {
  // Collections to backup
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
  
  // Retention policies
  retention: {
    daily: 7,    // Keep 7 daily backups
    weekly: 4,   // Keep 4 weekly backups
    monthly: 12, // Keep 12 monthly backups
  },
  
  // Compress backups
  compress: true,
  
  // Encrypt backups
  encrypt: false,
  
  // Backup format
  format: 'json',
};

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('[Backup] Created backup directory:', backupDir);
  }
}

// Get collection data with pagination
async function getCollectionData(collectionName) {
  const data = [];
  let lastDoc = null;
  const batchSize = 1000; // Firestore batch limit

  console.log(`[Backup] Fetching collection: ${collectionName}`);

  while (true) {
    let query = db.collection(collectionName).orderBy('created_at', 'asc').limit(batchSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data(),
      });
      lastDoc = doc;
    });

    console.log(`  Fetched ${data.length} documents...`);
  }

  console.log(`  Total: ${data.length} documents`);
  return data;
}

// Export collection to JSON
async function exportToJSON(collectionName, outputPath) {
  const data = await getCollectionData(collectionName);
  
  const backupData = {
    collection: collectionName,
    exported_at: new Date().toISOString(),
    count: data.length,
    data: data,
  };

  fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));
  
  return {
    collection: collectionName,
    count: data.length,
    size: fs.statSync(outputPath).size,
  };
}

// Compress file with gzip
async function compressFile(inputPath, outputPath) {
  console.log(`[Backup] Compressing: ${path.basename(inputPath)}`);
  
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);
  const gzipStream = createGzip();

  await pipeline(readStream, gzipStream, writeStream);
  
  // Remove original file
  fs.unlinkSync(inputPath);
  
  return {
    original: path.basename(inputPath),
    compressed: path.basename(outputPath),
    compressedSize: fs.statSync(outputPath).size,
  };
}

// Create full backup
export async function createBackup(options = {}) {
  const {
    collections = BACKUP_CONFIG.collections,
    compress = BACKUP_CONFIG.compress,
    encrypt = BACKUP_CONFIG.encrypt,
    uploadToCloud = false,
  } = options;

  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `backup_${timestamp}`;
  const backupPath = path.join(backupDir, backupId);

  console.log(`\n📦 Starting Firestore Backup: ${backupId}`);
  console.log('─────────────────────────────────────────────────────');

  const results = {
    backup_id: backupId,
    started_at: new Date().toISOString(),
    collections: [],
    total_documents: 0,
    total_size: 0,
    compressed_size: 0,
    encrypted: encrypt,
    status: 'in_progress',
  };

  try {
    // Create backup directory for this run
    fs.mkdirSync(backupPath, { recursive: true });

    // Backup each collection
    for (const collection of collections) {
      try {
        const outputPath = path.join(backupPath, `${collection}.json`);
        const stats = await exportToJSON(collection, outputPath);
        
        results.collections.push({
          collection,
          count: stats.count,
          size: stats.size,
          status: 'success',
        });
        
        results.total_documents += stats.count;
        results.total_size += stats.size;
      } catch (error) {
        console.error(`[Backup] Failed to backup ${collection}:`, error.message);
        results.collections.push({
          collection,
          status: 'failed',
          error: error.message,
        });
      }
    }

    // Compress if enabled
    if (compress) {
      console.log('\n🗜️  Compressing backup...');
      const tarPath = `${backupPath}.tar`;
      const gzPath = `${backupPath}.tar.gz`;
      
      // Create tar archive
      try {
        const { execSync } = await import('child_process');
        execSync(`tar -cf ${tarPath} -C ${backupDir} ${backupId}`);
        
        // Compress with gzip
        await compressFile(tarPath, gzPath);
        
        // Remove uncompressed directory
        fs.rmSync(backupPath, { recursive: true, force: true });
        
        results.compressed = true;
        results.compressed_size = fs.statSync(gzPath).size;
        results.backup_file = `${backupId}.tar.gz`;
        
        console.log(`  Compressed: ${(results.compressed_size / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.warn('[Backup] Compression failed, keeping uncompressed:', error.message);
        results.compressed = false;
        results.backup_file = backupId;
      }
    } else {
      results.backup_file = backupId;
    }

    // Encrypt if enabled
    if (encrypt && results.compressed) {
      console.log('\n🔒 Encrypting backup...');
      const encryptedPath = `${backupPath}.tar.gz.enc`;
      
      try {
        await encryptBackup(`${backupPath}.tar.gz`, { deleteOriginal: true });
        
        results.encrypted = true;
        results.encrypted_size = fs.statSync(encryptedPath).size;
        results.backup_file = `${backupId}.tar.gz.enc`;
        
        console.log(`  Encrypted: ${(results.encrypted_size / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.warn('[Backup] Encryption failed:', error.message);
        results.encrypted = false;
        results.encryption_error = error.message;
      }
    }

    // Save backup metadata
    results.completed_at = new Date().toISOString();
    results.status = 'completed';
    
    const metadataPath = path.join(backupDir, `${backupId}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(results, null, 2));

    console.log('\n✅ Backup completed successfully!');
    console.log('─────────────────────────────────────────────────────');
    console.log(`📊 Total Documents: ${results.total_documents}`);
    console.log(`💾 Total Size: ${(results.total_size / 1024 / 1024).toFixed(2)} MB`);
    if (results.compressed_size) {
      console.log(`🗜️  Compressed: ${(results.compressed_size / 1024 / 1024).toFixed(2)} MB`);
    }
    if (results.encrypted_size) {
      console.log(`🔒 Encrypted: ${(results.encrypted_size / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log(`📁 Backup File: ${results.backup_file}`);
    console.log('─────────────────────────────────────────────────────\n');

    // Monitor backup for anomalies
    try {
      await monitorBackup(results);
    } catch (monitorError) {
      console.warn('[Backup] Monitoring failed:', monitorError.message);
    }

    // Upload to cloud storage if enabled
    if (uploadToCloud) {
      try {
        const { uploadToCloudStorage } = await import('./cloudStorage.js');
        const backupFilePath = path.join(backupDir, results.backup_file);
        
        await uploadToCloudStorage(backupFilePath, `backups/${results.backup_file}`);
        results.cloud_upload = 'success';
      } catch (error) {
        console.error('[Backup] Cloud upload failed:', error.message);
        results.cloud_upload = 'failed';
        results.cloud_error = error.message;
      }
    }

    // Log backup to Firestore
    await db.collection('backup_logs').doc(backupId).set({
      ...results,
      created_at: results.started_at,
    });

    return results;
  } catch (error) {
    console.error('[Backup] Backup failed:', error.message);
    results.status = 'failed';
    results.error = error.message;
    results.failed_at = new Date().toISOString();
    
    // Save failure log
    await db.collection('backup_logs').doc(backupId).set({
      ...results,
      created_at: results.started_at,
    });
    
    throw error;
  }
}

// Restore from backup
export async function restoreBackup(backupId, options = {}) {
  const {
    collections = null, // Restore all if null
    overwrite = false,
    dryRun = false,
  } = options;

  console.log(`\n🔄 Starting Restore: ${backupId}`);
  console.log('─────────────────────────────────────────────────────');

  // Find backup file
  const backupPath = path.join(backupDir, backupId);
  const compressedPath = `${backupId}.tar.gz`;
  
  let extractPath = backupPath;
  let isCompressed = false;

  if (fs.existsSync(`${backupPath}.tar.gz`)) {
    isCompressed = true;
    extractPath = path.join(backupDir, `restore_${backupId}`);
    fs.mkdirSync(extractPath, { recursive: true });
    
    console.log('🗜️  Extracting compressed backup...');
    try {
      const { execSync } = await import('child_process');
      execSync(`tar -xzf ${path.join(backupDir, compressedPath)} -C ${extractPath}`);
    } catch (error) {
      throw new Error(`Failed to extract backup: ${error.message}`);
    }
  }

  if (!fs.existsSync(extractPath)) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  const results = {
    backup_id: backupId,
    started_at: new Date().toISOString(),
    collections: [],
    total_restored: 0,
    total_skipped: 0,
    status: 'in_progress',
    dry_run: dryRun,
  };

  try {
    // Read metadata if exists
    const metadataPath = path.join(backupDir, `${backupId}_metadata.json`);
    if (fs.existsSync(metadataPath)) {
      results.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }

    // Get list of collection files
    const files = fs.readdirSync(extractPath)
      .filter(f => f.endsWith('.json') && !f.endsWith('_metadata.json'));

    for (const file of files) {
      const collectionName = file.replace('.json', '');
      
      if (collections && !collections.includes(collectionName)) {
        continue;
      }

      console.log(`\n📋 Restoring collection: ${collectionName}`);
      
      const filePath = path.join(extractPath, file);
      const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const collectionStats = {
        collection: collectionName,
        total: backupData.count,
        restored: 0,
        skipped: 0,
        failed: 0,
      };

      // Restore documents
      const batch = db.batch();
      let batchCount = 0;

      for (const doc of backupData.data) {
        const docRef = db.collection(collectionName).doc(doc.id);
        
        try {
          if (dryRun) {
            collectionStats.restored++;
          } else {
            if (overwrite) {
              batch.set(docRef, doc, { merge: false });
            } else {
              // Check if document exists
              const existingDoc = await docRef.get();
              if (existingDoc.exists) {
                collectionStats.skipped++;
                results.total_skipped++;
              } else {
                batch.set(docRef, doc);
              }
            }
            collectionStats.restored++;
          }
          
          batchCount++;
          
          // Commit batch every 500 documents
          if (batchCount >= 500) {
            if (!dryRun) {
              await batch.commit();
            }
            batchCount = 0;
          }
        } catch (error) {
          console.error(`  Failed to restore ${doc.id}:`, error.message);
          collectionStats.failed++;
        }
      }

      // Commit remaining batch
      if (batchCount > 0 && !dryRun) {
        await batch.commit();
      }

      results.collections.push(collectionStats);
      results.total_restored += collectionStats.restored;
      
      console.log(`  ✓ Restored: ${collectionStats.restored}, Skipped: ${collectionStats.skipped}, Failed: ${collectionStats.failed}`);
    }

    results.completed_at = new Date().toISOString();
    results.status = 'completed';

    console.log('\n✅ Restore completed successfully!');
    console.log('─────────────────────────────────────────────────────');
    console.log(`📊 Total Restored: ${results.total_restored}`);
    console.log(`⏭️  Skipped: ${results.total_skipped}`);
    console.log('─────────────────────────────────────────────────────\n');

    // Log restore to Firestore
    await db.collection('restore_logs').doc().set({
      ...results,
      created_at: results.started_at,
    });

    // Cleanup extract directory
    if (isCompressed) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }

    return results;
  } catch (error) {
    console.error('[Restore] Restore failed:', error.message);
    results.status = 'failed';
    results.error = error.message;
    results.failed_at = new Date().toISOString();
    
    await db.collection('restore_logs').doc().set({
      ...results,
      created_at: results.started_at,
    });
    
    throw error;
  }
}

// List available backups
export async function listBackups() {
  const backups = [];
  
  const snapshot = await db.collection('backup_logs')
    .orderBy('created_at', 'desc')
    .limit(50)
    .get();

  snapshot.forEach(doc => {
    backups.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  return { backups };
}

// Get backup details
export async function getBackupDetails(backupId) {
  const doc = await db.collection('backup_logs').doc(backupId).get();
  
  if (!doc.exists) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

// Delete old backups (multiple retention policy)
export async function cleanupOldBackups() {
  console.log('[Backup] Cleaning up old backups with multiple retention policy...');
  console.log(`  Daily: ${BACKUP_CONFIG.retention.daily} days`);
  console.log(`  Weekly: ${BACKUP_CONFIG.retention.weekly} weeks`);
  console.log(`  Monthly: ${BACKUP_CONFIG.retention.monthly} months`);

  const now = new Date();
  const results = {
    total_deleted: 0,
    daily_kept: 0,
    weekly_kept: 0,
    monthly_kept: 0,
    deleted_backups: [],
  };

  // Get all backups
  const snapshot = await db.collection('backup_logs')
    .orderBy('created_at', 'desc')
    .get();

  const dailyCutoff = new Date(now.getTime() - (BACKUP_CONFIG.retention.daily * 24 * 60 * 60 * 1000));
  const weeklyCutoff = new Date(now.getTime() - (BACKUP_CONFIG.retention.weekly * 7 * 24 * 60 * 60 * 1000));
  const monthlyCutoff = new Date(now.getTime() - (BACKUP_CONFIG.retention.monthly * 30 * 24 * 60 * 60 * 1000));

  let weeklyBackupsKept = 0;
  let monthlyBackupsKept = 0;
  let lastWeeklyBackup = null;
  let lastMonthlyBackup = null;

  for (const doc of snapshot.docs) {
    const backupData = doc.data();
    const backupId = doc.id;
    const backupDate = new Date(backupData.created_at);
    
    let shouldKeep = false;
    let keepReason = null;

    // Rule 1: Keep all daily backups within the last 7 days
    if (backupDate >= dailyCutoff) {
      shouldKeep = true;
      keepReason = 'daily';
      results.daily_kept++;
    }
    // Rule 2: Keep one backup per week for the last 4 weeks
    else if (backupDate >= weeklyCutoff) {
      // Keep the most recent backup of each week
      const weekKey = getWeekKey(backupDate);
      if (!lastWeeklyBackup || lastWeeklyBackup !== weekKey) {
        shouldKeep = true;
        keepReason = 'weekly';
        lastWeeklyBackup = weekKey;
        weeklyBackupsKept++;
        results.weekly_kept++;
      }
    }
    // Rule 3: Keep one backup per month for the last 12 months
    else if (backupDate >= monthlyCutoff) {
      // Keep the most recent backup of each month
      const monthKey = getMonthKey(backupDate);
      if (!lastMonthlyBackup || lastMonthlyBackup !== monthKey) {
        shouldKeep = true;
        keepReason = 'monthly';
        lastMonthlyBackup = monthKey;
        monthlyBackupsKept++;
        results.monthly_kept++;
      }
    }

    // Delete if not kept
    if (!shouldKeep) {
      try {
        // Delete backup files
        const backupPath = path.join(backupDir, backupId);
        const compressedPath = path.join(backupDir, `${backupId}.tar.gz`);
        const encryptedPath = path.join(backupDir, `${backupId}.tar.gz.enc`);

        if (fs.existsSync(backupPath)) {
          fs.rmSync(backupPath, { recursive: true, force: true });
        }
        if (fs.existsSync(compressedPath)) {
          fs.unlinkSync(compressedPath);
        }
        if (fs.existsSync(encryptedPath)) {
          fs.unlinkSync(encryptedPath);
        }

        // Delete metadata
        const metadataPath = path.join(backupDir, `${backupId}_metadata.json`);
        if (fs.existsSync(metadataPath)) {
          fs.unlinkSync(metadataPath);
        }

        // Delete from Firestore
        await doc.ref.delete();

        results.total_deleted++;
        results.deleted_backups.push(backupId);
        
        console.log(`  Deleted: ${backupId} (${backupDate.toISOString().split('T')[0]})`);
      } catch (error) {
        console.error(`  Failed to delete ${backupId}:`, error.message);
      }
    } else {
      console.log(`  Kept: ${backupId} (${keepReason})`);
    }
  }

  console.log(`\n[Backup] Cleanup completed:`);
  console.log(`  Daily backups kept: ${results.daily_kept}`);
  console.log(`  Weekly backups kept: ${results.weekly_kept}`);
  console.log(`  Monthly backups kept: ${results.monthly_kept}`);
  console.log(`  Total deleted: ${results.total_deleted}`);

  // Log cleanup result
  await db.collection('cleanup_logs').doc().set({
    type: 'backup_retention',
    ...results,
    created_at: new Date().toISOString(),
  });

  return results;
}

// Helper: Get week key for date
function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); // Monday
  return d.toISOString().split('T')[0];
}

// Helper: Get month key for date
function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupDetails,
  cleanupOldBackups,
  BACKUP_CONFIG,
};
