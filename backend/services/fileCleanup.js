import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// File cleanup configuration
const CLEANUP_CONFIG = {
  // Delete files older than 30 days
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  
  // Directories to clean
  directories: [
    'uploads/proofs',
    'logs',
  ],
  
  // File patterns to delete
  patterns: ['.jpg', '.jpeg', '.png', '.pdf', '.log'],
  
  // Keep minimum recent files
  keepMinimum: 10,
};

// Get file age in days
function getFileAge(filePath) {
  const stats = fs.statSync(filePath);
  const now = Date.now();
  const mtime = stats.mtimeMs;
  return now - mtime;
}

// Clean directory
function cleanDirectory(dirPath, config) {
  if (!fs.existsSync(dirPath)) {
    console.log(`[Cleanup] Directory not found: ${dirPath}`);
    return { deleted: 0, size: 0 };
  }

  const files = fs.readdirSync(dirPath);
  let deleted = 0;
  let totalSize = 0;

  // Get all files with their ages
  const filesWithAge = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return config.patterns.includes(ext);
    })
    .map(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        age: Date.now() - stats.mtimeMs,
        size: stats.size,
      };
    })
    .sort((a, b) => b.age - a.age); // Oldest first

  // Don't delete if we have less than minimum files
  if (filesWithAge.length <= config.keepMinimum) {
    console.log(`[Cleanup] Skipping ${dirPath}: only ${filesWithAge.length} files (minimum: ${config.keepMinimum})`);
    return { deleted: 0, size: 0 };
  }

  // Delete old files
  for (const file of filesWithAge) {
    if (filesWithAge.length - deleted <= config.keepMinimum) {
      break; // Keep minimum files
    }

    if (file.age > config.maxAge) {
      try {
        fs.unlinkSync(file.path);
        deleted++;
        totalSize += file.size;
        console.log(`[Cleanup] Deleted: ${file.name} (${(file.size / 1024).toFixed(2)} KB, ${(file.age / (1000 * 60 * 60 * 24)).toFixed(0)} days old)`);
      } catch (error) {
        console.error(`[Cleanup] Failed to delete ${file.name}:`, error.message);
      }
    }
  }

  return { deleted, size: totalSize };
}

// Main cleanup function
export function runFileCleanup() {
  console.log('[Cleanup] Starting file cleanup...');
  
  const results = {
    timestamp: new Date().toISOString(),
    directories: [],
    totalDeleted: 0,
    totalSize: 0,
  };

  for (const dir of CLEANUP_CONFIG.directories) {
    const dirPath = path.join(rootDir, dir);
    const result = cleanDirectory(dirPath, CLEANUP_CONFIG);
    
    results.directories.push({
      path: dir,
      deleted: result.deleted,
      size: result.size,
    });
    
    results.totalDeleted += result.deleted;
    results.totalSize += result.size;
  }

  console.log(`[Cleanup] Completed: ${results.totalDeleted} files deleted, ${(results.totalSize / 1024 / 1024).toFixed(2)} MB freed`);
  
  // Log cleanup result
  logCleanup(results);
  
  return results;
}

// Log cleanup results to Firestore
async function logCleanup(results) {
  try {
    const { db } = await import('../config/firebase.js');
    await db.collection('cleanup_logs').doc().set({
      ...results,
      created_at: results.timestamp,
    });
  } catch (error) {
    console.error('[Cleanup] Failed to log results:', error.message);
  }
}

// Schedule cleanup job
export function scheduleFileCleanup() {
  // Run every day at 3 AM
  const job = cron.schedule('0 3 * * *', () => {
    runFileCleanup();
  });

  console.log('[Cleanup] Scheduled daily cleanup at 3:00 AM');
  
  return job;
}

// Manual cleanup trigger (for admin API)
export function triggerCleanup() {
  return runFileCleanup();
}

export default {
  runFileCleanup,
  scheduleFileCleanup,
  triggerCleanup,
  CLEANUP_CONFIG,
};
