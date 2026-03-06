import { db } from '../config/firebase.js';

// Audit log levels
export const AuditLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// Audit log categories
export const AuditCategory = {
  AUTH: 'auth',
  USER_MANAGEMENT: 'user_management',
  PAYMENT: 'payment',
  CREDIT: 'credit',
  VPN: 'vpn',
  ADMIN: 'admin',
  SECURITY: 'security',
  SYSTEM: 'system',
};

// Create audit log
export async function createAuditLog({
  userId,
  action,
  category,
  level = AuditLevel.INFO,
  resource,
  resourceId,
  changes,
  metadata = {},
  ipAddress,
  userAgent,
}) {
  const auditRef = db.collection('audit_logs').doc();
  
  const auditData = {
    user_id: userId || 'system',
    action,
    category,
    level,
    resource: resource || null,
    resource_id: resourceId || null,
    changes: changes || null,
    metadata,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    created_at: new Date().toISOString(),
  };

  await auditRef.set(auditData);

  // Also create a compact log for analytics
  const compactLog = {
    a: action,
    c: category,
    l: level,
    u: userId,
    t: Date.now(),
  };

  await db.collection('audit_logs_compact').doc().set(compactLog);

  return auditRef.id;
}

// Audit logging middleware
export function auditMiddleware(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture response
  res.json = (data) => {
    // Log after response is sent
    setImmediate(async () => {
      try {
        await logRequest(req, res, data);
      } catch (error) {
        console.error('Audit log error:', error.message);
      }
    });

    return originalJson(data);
  };

  next();
}

// Log significant requests
async function logRequest(req, res, responseData) {
  // Skip logging for certain paths
  const skipPaths = ['/health', '/api/auth/verify'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return;
  }

  // Determine if this is a significant action to log
  const significantActions = {
    'POST': ['/api/billing/submit', '/api/credit/transfer', '/api/admin/'],
    'PATCH': ['/api/admin/', '/api/user/'],
    'DELETE': ['/api/admin/', '/api/vpn/device'],
  };

  const actions = significantActions[req.method] || [];
  const isSignificant = actions.some(path => req.path.startsWith(path));

  if (!isSignificant && res.statusCode < 400) {
    return; // Skip logging successful non-significant requests
  }

  // Determine category
  let category = AuditCategory.SYSTEM;
  if (req.path.includes('/admin/')) category = AuditCategory.ADMIN;
  else if (req.path.includes('/billing/') || req.path.includes('/payment/')) category = AuditCategory.PAYMENT;
  else if (req.path.includes('/credit/')) category = AuditCategory.CREDIT;
  else if (req.path.includes('/vpn/')) category = AuditCategory.VPN;
  else if (req.path.includes('/auth/')) category = AuditCategory.AUTH;
  else if (req.path.includes('/user/')) category = AuditCategory.USER_MANAGEMENT;

  // Determine level
  let level = AuditLevel.INFO;
  if (res.statusCode >= 500) level = AuditLevel.ERROR;
  else if (res.statusCode >= 400) level = AuditLevel.WARNING;
  else if (req.path.includes('/admin/') && ['PATCH', 'DELETE'].includes(req.method)) level = AuditLevel.INFO;

  // Get user ID from request
  const userId = req.user?.uid || req.body?.user_id || 'anonymous';

  await createAuditLog({
    userId,
    action: `${req.method} ${req.path}`,
    category,
    level,
    resource: req.path.split('/')[2],
    resourceId: req.params.id,
    changes: req.body,
    metadata: {
      statusCode: res.statusCode,
      response: responseData,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

// Helper function to log admin actions
export async function logAdminAction(userId, action, details = {}) {
  return await createAuditLog({
    userId,
    action,
    category: AuditCategory.ADMIN,
    level: AuditLevel.INFO,
    metadata: details,
  });
}

// Helper function to log security events
export async function logSecurityEvent(userId, action, details = {}) {
  return await createAuditLog({
    userId,
    action,
    category: AuditCategory.SECURITY,
    level: AuditLevel.WARNING,
    metadata: details,
  });
}

// Get audit logs (admin)
export async function getAuditLogs(filters = {}) {
  let query = db.collection('audit_logs')
    .orderBy('created_at', 'desc')
    .limit(filters.limit || 50);

  if (filters.category) {
    query = query.where('category', '==', filters.category);
  }

  if (filters.level) {
    query = query.where('level', '==', filters.level);
  }

  if (filters.userId) {
    query = query.where('user_id', '==', filters.userId);
  }

  if (filters.startDate) {
    query = query.where('created_at', '>=', filters.startDate);
  }

  if (filters.endDate) {
    query = query.where('created_at', '<=', filters.endDate);
  }

  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export default {
  createAuditLog,
  auditMiddleware,
  logAdminAction,
  logSecurityEvent,
  getAuditLogs,
  AuditLevel,
  AuditCategory,
};
