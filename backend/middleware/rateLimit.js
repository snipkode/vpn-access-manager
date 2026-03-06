import rateLimit from 'express-rate-limit';
import { auth, db } from '../config/firebase.js';

// Store for rate limiting (in production, use Redis)
const store = new Map();

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Custom rate limit middleware factory
function createRateLimiter({ windowMs, max, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: message || 'Please try again later',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => {
      // Use IP or user UID if authenticated
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          // Try to get UID from token without full verification (lightweight)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
          const payload = JSON.parse(jsonPayload);
          return payload.uid || req.ip;
        } catch {
          return req.ip;
        }
      }
      return req.ip;
    }),
    handler: (req, res, next, options) => {
      res.status(429).json(options.message);
    },
  });
}

// Rate limiters for different endpoints
// Development mode: 1000 requests for all endpoints
// Production mode: Specific limits per endpoint
export const rateLimiters = {
  // Payment submission
  billingSubmit: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 5,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many payment submissions. Maximum 1000 per hour.' 
      : 'Too many payment submissions. Maximum 5 per hour.',
  }),

  // Viewing payment history
  billingView: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 300,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many requests. Maximum 1000 per hour.' 
      : 'Too many requests. Maximum 300 per hour.',
  }),

  // Admin actions
  adminActions: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 500,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many admin requests. Maximum 1000 per hour.' 
      : 'Too many admin requests. Maximum 500 per hour.',
  }),

  // Admin billing view (for dashboard polling)
  adminBillingView: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 1000,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many billing requests. Maximum 1000 per hour.' 
      : 'Too many billing requests. Maximum 1000 per hour.',
  }),

  // Admin billing write operations
  adminBillingWrite: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 50,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many billing operations. Maximum 1000 per hour.' 
      : 'Too many billing operations. Maximum 50 per hour.',
  }),

  // General API rate limit
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 1000 : 30,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many requests. Maximum 1000 per minute.' 
      : 'Too many requests. Maximum 30 per minute.',
  }),

  // Auth endpoints (keep strict even in dev for security testing)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many authentication attempts. Maximum 1000 per 15 minutes.' 
      : 'Too many authentication attempts. Maximum 10 per 15 minutes.',
  }),

  // VPN generation
  vpnGenerate: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many VPN config generations. Maximum 1000 per hour.' 
      : 'Too many VPN config generations. Maximum 10 per hour.',
  }),
};

// IP-based blocking for suspicious activity
const blockedIPs = new Map();

export function checkBlockedIP(req, res, next) {
  const ip = req.ip;
  
  if (blockedIPs.has(ip)) {
    const block = blockedIPs.get(ip);
    if (Date.now() < block.until) {
      const remaining = Math.ceil((block.until - Date.now()) / 1000);
      return res.status(403).json({
        error: 'IP blocked',
        message: `Your IP has been temporarily blocked due to suspicious activity`,
        retryAfter: remaining,
      });
    } else {
      blockedIPs.delete(ip);
    }
  }
  
  next();
}

// Track suspicious activity
export function trackSuspiciousActivity(ip, reason) {
  const now = Date.now();
  const existing = blockedIPs.get(ip) || { count: 0, until: 0 };
  
  existing.count += 1;
  
  // Block for increasing durations based on count
  if (existing.count >= 3) {
    existing.until = now + (60 * 60 * 1000); // 1 hour
  } else if (existing.count >= 2) {
    existing.until = now + (10 * 60 * 1000); // 10 minutes
  }
  
  blockedIPs.set(ip, existing);
  
  console.log(`[Security] Suspicious activity from ${ip}: ${reason} (count: ${existing.count})`);
}

// Validate payment proof file
export function validateProofFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'Proof file is required' });
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      allowed: 'JPEG, PNG, or PDF'
    });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File too large',
      maxSize: '5MB'
    });
  }

  next();
}

// Request logging for audit
export function logRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  
  // Get user ID if authenticated
  let userId = 'anonymous';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = 'authenticated';
  }

  console.log(`[${timestamp}] ${method} ${path} - ${ip} - ${userId}`);
  
  next();
}
