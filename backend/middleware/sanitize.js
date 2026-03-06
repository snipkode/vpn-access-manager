import validator from 'validator';

// Sanitize string input
export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  // Remove XSS patterns
  let sanitized = validator.escape(input.trim());
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
}

// Sanitize object recursively
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

// Sanitize request body
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

// Validate email
export function validateEmail(email) {
  return validator.isEmail(email);
}

// Validate URL
export function validateURL(url) {
  return validator.isURL(url);
}

// Validate alphanumeric
export function validateAlphanumeric(str) {
  return validator.isAlphanumeric(str);
}

// Validate length
export function validateLength(str, min = 0, max = Infinity) {
  return validator.isLength(str, { min, max });
}

// Validate number
export function validateNumber(num, options = {}) {
  const { min, max, allowDecimal = true } = options;
  return validator.isNumeric(String(num), {
    no_symbols: !allowDecimal,
    ...(min !== undefined && { min: String(min) }),
    ...(max !== undefined && { max: String(max) }),
  });
}

// Sanitize file filename
export function sanitizeFilename(filename) {
  // Remove path traversal attempts
  let sanitized = filename.replace(/[/\\?%*:|"<>]/g, '-');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  return sanitized;
}

export default {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  validateEmail,
  validateURL,
  validateAlphanumeric,
  validateLength,
  validateNumber,
  sanitizeFilename,
};
