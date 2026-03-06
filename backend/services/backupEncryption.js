import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { createCipheriv, createDecipheriv } from 'crypto';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  // AES-256-CBC encryption
  algorithm: 'aes-256-cbc',
  
  // Key length for AES-256
  keyLength: 32, // 256 bits
  
  // IV length for CBC mode
  ivLength: 16, // 128 bits
  
  // Salt length
  saltLength: 16,
};

// Get encryption key from environment or generate
function getEncryptionKey() {
  let key = process.env.BACKUP_ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('[Encryption] No encryption key provided, generating temporary key');
    key = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength).toString('hex');
    console.log('[Encryption] Generated key (save this securely):', key);
  }
  
  // Convert hex string to buffer
  if (typeof key === 'string') {
    key = Buffer.from(key, 'hex');
  }
  
  if (key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Invalid key length. Expected ${ENCRYPTION_CONFIG.keyLength} bytes, got ${key.length}`);
  }
  
  return key;
}

// Generate random IV
function generateIV() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
}

// Generate random salt
function generateSalt() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
}

// Encrypt file
export async function encryptFile(inputPath, outputPath, password = null) {
  console.log(`[Encryption] Encrypting: ${inputPath}`);
  
  const key = getEncryptionKey();
  const iv = generateIV();
  const salt = generateSalt();
  
  // Derive key from password if provided
  const actualKey = password 
    ? deriveKeyFromPassword(password, salt)
    : key;
  
  const cipher = createCipheriv(
    ENCRYPTION_CONFIG.algorithm,
    actualKey,
    iv
  );
  
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);
  
  // Write salt and IV to output file first
  writeStream.write(salt);
  writeStream.write(iv);
  
  await pipeline(readStream, cipher, writeStream);
  
  const inputStats = fs.statSync(inputPath);
  const outputStats = fs.statSync(outputPath);
  
  console.log(`[Encryption] Encrypted: ${outputPath}`);
  console.log(`  Original size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Encrypted size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
  
  return {
    encrypted: true,
    input: inputPath,
    output: outputPath,
    algorithm: ENCRYPTION_CONFIG.algorithm,
    original_size: inputStats.size,
    encrypted_size: outputStats.size,
  };
}

// Decrypt file
export async function decryptFile(inputPath, outputPath, password = null) {
  console.log(`[Encryption] Decrypting: ${inputPath}`);
  
  const key = getEncryptionKey();
  
  // Read salt and IV from input file
  const fileBuffer = fs.readFileSync(inputPath);
  const salt = fileBuffer.slice(0, ENCRYPTION_CONFIG.saltLength);
  const iv = fileBuffer.slice(ENCRYPTION_CONFIG.saltLength, ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength);
  const encryptedData = fileBuffer.slice(ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength);
  
  // Derive key from password if provided
  const actualKey = password
    ? deriveKeyFromPassword(password, salt)
    : key;
  
  const decipher = createDecipheriv(
    ENCRYPTION_CONFIG.algorithm,
    actualKey,
    iv
  );
  
  const writeStream = createWriteStream(outputPath);
  
  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);
  
  writeStream.write(decrypted);
  writeStream.end();
  
  const inputStats = fs.statSync(inputPath);
  const outputStats = fs.statSync(outputPath);
  
  console.log(`[Encryption] Decrypted: ${outputPath}`);
  console.log(`  Encrypted size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Decrypted size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
  
  return {
    decrypted: true,
    input: inputPath,
    output: outputPath,
    algorithm: ENCRYPTION_CONFIG.algorithm,
    encrypted_size: inputStats.size,
    decrypted_size: outputStats.size,
  };
}

// Derive key from password using PBKDF2
function deriveKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    100000, // iterations
    ENCRYPTION_CONFIG.keyLength,
    'sha256'
  );
}

// Encrypt backup (wrapper for backup.js integration)
export async function encryptBackup(backupPath, options = {}) {
  const { 
    password, 
    deleteOriginal = true,
    outputDir 
  } = options;
  
  const encryptedPath = `${backupPath}.enc`;
  
  await encryptFile(backupPath, encryptedPath, password);
  
  if (deleteOriginal) {
    // Securely delete original file
    secureDelete(backupPath);
  }
  
  return {
    encrypted_path: encryptedPath,
    original_path: deleteOriginal ? null : backupPath,
  };
}

// Decrypt backup (wrapper for backup.js integration)
export async function decryptBackup(encryptedPath, options = {}) {
  const { 
    password,
    deleteEncrypted = false,
    outputDir 
  } = options;
  
  const decryptedPath = encryptedPath.replace('.enc', '');
  
  await decryptFile(encryptedPath, decryptedPath, password);
  
  if (deleteEncrypted) {
    secureDelete(encryptedPath);
  }
  
  return {
    decrypted_path: decryptedPath,
    encrypted_path: deleteEncrypted ? null : encryptedPath,
  };
}

// Secure delete (overwrite with random data before deletion)
function secureDelete(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const bufferSize = 1024 * 1024; // 1MB
    const passes = 3; // 3 passes for secure deletion
    
    for (let pass = 0; pass < passes; pass++) {
      const fd = fs.openSync(filePath, 'r+');
      const randomData = crypto.randomBytes(Math.min(bufferSize, stats.size));
      
      let offset = 0;
      while (offset < stats.size) {
        const writeSize = Math.min(bufferSize, stats.size - offset);
        fs.writeSync(fd, randomData, 0, writeSize, offset);
        offset += writeSize;
      }
      
      fs.closeSync(fd);
      fs.sync(); // Ensure data is written to disk
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    console.log(`[Encryption] Securely deleted: ${filePath}`);
  } catch (error) {
    console.error('[Encryption] Secure delete failed:', error.message);
    // Fallback to normal delete
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // Ignore
    }
  }
}

// Generate new encryption key
export function generateEncryptionKey() {
  const key = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  return key.toString('hex');
}

// Validate encryption key
export function validateEncryptionKey(key) {
  try {
    if (typeof key === 'string') {
      key = Buffer.from(key, 'hex');
    }
    
    if (key.length !== ENCRYPTION_CONFIG.keyLength) {
      return {
        valid: false,
        error: `Invalid key length. Expected ${ENCRYPTION_CONFIG.keyLength * 2} hex characters, got ${key.length * 2}`,
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

// Test encryption/decryption
export async function testEncryption() {
  const testDir = '/tmp/backup-encryption-test';
  const testFile = `${testDir}/test.txt`;
  const encryptedFile = `${testFile}.enc`;
  const decryptedFile = `${testFile}.decrypted`;
  
  try {
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create test file
    const testData = 'This is a test backup file for encryption testing.';
    fs.writeFileSync(testFile, testData);
    
    // Encrypt
    await encryptFile(testFile, encryptedFile);
    
    // Decrypt
    await decryptFile(encryptedFile, decryptedFile);
    
    // Verify
    const decryptedData = fs.readFileSync(decryptedFile, 'utf8');
    
    if (decryptedData === testData) {
      console.log('[Encryption] Test passed: Encryption/Decryption working correctly');
      
      // Cleanup
      fs.unlinkSync(testFile);
      fs.unlinkSync(encryptedFile);
      fs.unlinkSync(decryptedFile);
      fs.rmdirSync(testDir);
      
      return {
        success: true,
        message: 'Encryption test passed',
      };
    } else {
      throw new Error('Decrypted data does not match original');
    }
  } catch (error) {
    console.error('[Encryption] Test failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  encryptFile,
  decryptFile,
  encryptBackup,
  decryptBackup,
  generateEncryptionKey,
  validateEncryptionKey,
  testEncryption,
  ENCRYPTION_CONFIG,
};
