import { fileTypeFromFile } from 'file-type';
import fs from 'fs';

// Allowed MIME types for different upload types
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf'],
  proof: ['image/jpeg', 'image/png', 'application/pdf'],
};

// Magic numbers for file type detection
const MAGIC_NUMBERS = {
  jpeg: { offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  png: { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  pdf: { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  gif: { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
};

// Validate file using magic numbers
export function validateMagicNumbers(filePath, expectedType) {
  try {
    const buffer = fs.readFileSync(filePath, { encoding: null, length: 16 });
    
    // Check against magic numbers
    for (const [type, magic] of Object.entries(MAGIC_NUMBERS)) {
      let matches = true;
      for (let i = 0; i < magic.bytes.length; i++) {
        if (buffer[magic.offset + i] !== magic.bytes[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        // Verify expected type matches detected type
        if (expectedType === 'image' && ['jpeg', 'png', 'gif'].includes(type)) {
          return { valid: true, detectedType: type };
        }
        if (expectedType === 'document' && type === 'pdf') {
          return { valid: true, detectedType: type };
        }
        if (expectedType === 'proof' && ['jpeg', 'png', 'pdf'].includes(type)) {
          return { valid: true, detectedType: type };
        }
      }
    }
    
    return { valid: false, detectedType: 'unknown' };
  } catch (error) {
    console.error('Magic number validation error:', error.message);
    return { valid: false, error: error.message };
  }
}

// Validate file using file-type package
export async function validateFileType(filePath) {
  try {
    const type = await fileTypeFromFile(filePath);
    
    if (!type) {
      return { valid: false, mime: null, error: 'Unable to determine file type' };
    }
    
    return {
      valid: true,
      mime: type.mime,
      ext: type.ext,
    };
  } catch (error) {
    console.error('File type validation error:', error.message);
    return { valid: false, error: error.message };
  }
}

// Comprehensive file validation
export async function validateFile(filePath, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = 'proof',
    checkMagicNumbers = true,
  } = options;

  const result = {
    valid: false,
    errors: [],
    warnings: [],
    info: {},
  };

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    result.errors.push('File does not exist');
    return result;
  }

  // Get file stats
  try {
    const stats = fs.statSync(filePath);
    result.info.size = stats.size;
    result.info.created = stats.birthtime;
    result.info.modified = stats.mtime;

    // Check file size
    if (stats.size > maxSize) {
      result.errors.push(`File size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${maxSize / 1024 / 1024}MB)`);
    }

    if (stats.size === 0) {
      result.errors.push('File is empty');
    }
  } catch (error) {
    result.errors.push(`Failed to read file stats: ${error.message}`);
    return result;
  }

  // Validate MIME type
  const typeResult = await validateFileType(filePath);
  if (!typeResult.valid) {
    result.errors.push(typeResult.error || 'Invalid file type');
  } else {
    result.info.mime = typeResult.mime;
    result.info.ext = typeResult.ext;

    // Check if MIME type is allowed
    const allowedMimes = ALLOWED_MIME_TYPES[allowedTypes] || ALLOWED_MIME_TYPES.proof;
    if (!allowedMimes.includes(typeResult.mime)) {
      result.errors.push(`File type ${typeResult.mime} is not allowed`);
    }
  }

  // Validate magic numbers
  if (checkMagicNumbers && result.errors.length === 0) {
    const magicResult = validateMagicNumbers(filePath, allowedTypes);
    if (!magicResult.valid) {
      result.warnings.push('File content does not match extension (possible spoofing)');
    } else {
      result.info.detectedType = magicResult.detectedType;
    }
  }

  // Check for embedded scripts (basic check)
  if (result.errors.length === 0 && allowedTypes === 'image') {
    try {
      const content = fs.readFileSync(filePath, 'utf8', { start: 0, length: 1024 });
      if (content.includes('<script') || content.includes('javascript:')) {
        result.warnings.push('File may contain embedded scripts');
      }
    } catch (error) {
      // Binary file, can't read as text - this is expected
    }
  }

  // Final validation
  result.valid = result.errors.length === 0;

  return result;
}

// Middleware for file validation
export function fileValidationMiddleware(options = {}) {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    const validation = await validateFile(req.file.path, options);

    if (!validation.valid) {
      // Delete invalid file
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        // Ignore delete error
      }

      return res.status(400).json({
        error: 'File validation failed',
        details: validation.errors,
        warnings: validation.warnings,
      });
    }

    // Add validation info to request
    req.fileValidation = validation;

    // Add warnings to response headers
    if (validation.warnings.length > 0) {
      res.set('X-File-Warnings', validation.warnings.join('; '));
    }

    next();
  };
}

export default {
  validateFile,
  validateFileType,
  validateMagicNumbers,
  fileValidationMiddleware,
  ALLOWED_MIME_TYPES,
};
