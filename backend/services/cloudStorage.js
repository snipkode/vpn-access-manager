import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Cloud storage configuration
const CLOUD_CONFIG = {
  // Use Google Cloud Storage (S3-compatible) or AWS S3
  provider: process.env.CLOUD_STORAGE_PROVIDER || 'gcs', // 'gcs' or 's3'
  
  // GCS Configuration
  gcs: {
    endpoint: process.env.GCS_ENDPOINT || 'https://storage.googleapis.com',
    bucket: process.env.GCS_BUCKET,
    keyFilename: process.env.GCS_KEY_FILE,
  },
  
  // S3 Configuration
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
};

let s3Client = null;

// Initialize S3 client
function getS3Client() {
  if (s3Client) return s3Client;

  const config = CLOUD_CONFIG.provider === 'gcs' ? CLOUD_CONFIG.gcs : CLOUD_CONFIG.s3;

  s3Client = new S3Client({
    endpoint: config.endpoint,
    region: config.region || 'auto',
    credentials: {
      accessKeyId: config.accessKeyId || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      secretAccessKey: config.secretAccessKey || 'dummy',
    },
    forcePathStyle: true, // Required for GCS
  });

  return s3Client;
}

// Upload file to cloud storage
export async function uploadToCloudStorage(filePath, key) {
  const config = CLOUD_CONFIG.provider === 'gcs' ? CLOUD_CONFIG.gcs : CLOUD_CONFIG.s3;
  
  if (!config.bucket) {
    throw new Error('Cloud storage bucket not configured');
  }

  console.log(`[Cloud] Uploading to ${CLOUD_CONFIG.provider}: ${key}`);

  const fileContent = fs.readFileSync(filePath);
  const fileSize = fs.statSync(filePath).size;

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: fileContent,
    ContentType: getContentType(filePath),
    Metadata: {
      'original-size': fileSize.toString(),
      'uploaded-at': new Date().toISOString(),
    },
  });

  try {
    const client = getS3Client();
    await client.send(command);
    
    const url = `https://${config.bucket}.storage.googleapis.com/${key}`;
    
    console.log(`[Cloud] Upload successful: ${url}`);
    
    return {
      success: true,
      url,
      key,
      size: fileSize,
    };
  } catch (error) {
    console.error('[Cloud] Upload failed:', error.message);
    throw new Error(`Cloud upload failed: ${error.message}`);
  }
}

// Download file from cloud storage
export async function downloadFromCloudStorage(key, downloadPath) {
  const config = CLOUD_CONFIG.provider === 'gcs' ? CLOUD_CONFIG.gcs : CLOUD_CONFIG.s3;
  
  if (!config.bucket) {
    throw new Error('Cloud storage bucket not configured');
  }

  console.log(`[Cloud] Downloading from ${CLOUD_CONFIG.provider}: ${key}`);

  // For GCS, we can use direct HTTP download
  if (CLOUD_CONFIG.provider === 'gcs') {
    const { execSync } = await import('child_process');
    const url = `https://storage.googleapis.com/${config.bucket}/${key}`;
    
    try {
      execSync(`curl -o "${downloadPath}" "${url}"`);
      console.log(`[Cloud] Download successful: ${downloadPath}`);
      
      return {
        success: true,
        path: downloadPath,
        size: fs.statSync(downloadPath).size,
      };
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  throw new Error('Download not implemented for S3 provider');
}

// Delete file from cloud storage
export async function deleteFromCloudStorage(key) {
  const config = CLOUD_CONFIG.provider === 'gcs' ? CLOUD_CONFIG.gcs : CLOUD_CONFIG.s3;
  
  if (!config.bucket) {
    throw new Error('Cloud storage bucket not configured');
  }

  console.log(`[Cloud] Deleting: ${key}`);

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    const client = getS3Client();
    await client.send(command);
    
    console.log(`[Cloud] Delete successful: ${key}`);
    
    return { success: true, key };
  } catch (error) {
    console.error('[Cloud] Delete failed:', error.message);
    throw new Error(`Cloud delete failed: ${error.message}`);
  }
}

// List backups in cloud storage
export async function listCloudBackups(prefix = 'backups/') {
  const config = CLOUD_CONFIG.provider === 'gcs' ? CLOUD_CONFIG.gcs : CLOUD_CONFIG.s3;
  
  if (!config.bucket) {
    throw new Error('Cloud storage bucket not configured');
  }

  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix,
  });

  try {
    const client = getS3Client();
    const response = await client.send(command);
    
    const backups = response.Contents?.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      etag: obj.ETag,
    })) || [];

    return { backups };
  } catch (error) {
    console.error('[Cloud] List failed:', error.message);
    throw new Error(`Cloud list failed: ${error.message}`);
  }
}

// Get content type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const contentTypes = {
    '.gz': 'application/gzip',
    '.tar': 'application/x-tar',
    '.json': 'application/json',
    '.zip': 'application/zip',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

// Test cloud storage connection
export async function testCloudStorage() {
  const config = CLOUD_CONFIG.provider === 'gcs' ? CLOUD_CONFIG.gcs : CLOUD_CONFIG.s3;
  
  console.log('[Cloud] Testing connection...');
  console.log(`  Provider: ${CLOUD_CONFIG.provider}`);
  console.log(`  Bucket: ${config.bucket || 'not configured'}`);
  console.log(`  Endpoint: ${config.endpoint || 'default'}`);

  if (!config.bucket) {
    return {
      success: false,
      message: 'Bucket not configured',
    };
  }

  try {
    // Test by listing objects
    await listCloudBackups('test-connection-');
    
    return {
      success: true,
      message: 'Connection successful',
      provider: CLOUD_CONFIG.provider,
      bucket: config.bucket,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

export default {
  uploadToCloudStorage,
  downloadFromCloudStorage,
  deleteFromCloudStorage,
  listCloudBackups,
  testCloudStorage,
  CLOUD_CONFIG,
};
