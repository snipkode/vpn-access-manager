/**
 * Standard API Response Contract
 * 
 * All API responses should follow this structure for consistency
 */

// Success Response Format
export const successResponse = (res, data, message = 'Success') => {
  return res.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

// Error Response Format
export const errorResponse = (res, statusCode, error, message, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Pagination Response Format
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / (pagination.limit || 10)),
      hasNext: pagination.page * (pagination.limit || 10) < pagination.total,
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

// Rate Limit Response Format
export const rateLimitResponse = (res, retryAfter, message = 'Too many requests') => {
  res.set('Retry-After', retryAfter.toString());
  
  return res.status(429).json({
    success: false,
    error: 'RATE_LIMIT',
    message,
    retryAfter,
    timestamp: new Date().toISOString(),
  });
};

// Validation Error Response Format
export const validationErrorResponse = (res, errors, message = 'Validation failed') => {
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

// Unauthorized Response Format
export const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    error: 'UNAUTHORIZED',
    message,
    timestamp: new Date().toISOString(),
  });
};

// Forbidden Response Format
export const forbiddenResponse = (res, message = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    error: 'FORBIDDEN',
    message,
    timestamp: new Date().toISOString(),
  });
};

// Not Found Response Format
export const notFoundResponse = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message,
    timestamp: new Date().toISOString(),
  });
};

// Conflict Response Format
export const conflictResponse = (res, message = 'Resource already exists') => {
  return res.status(409).json({
    success: false,
    error: 'CONFLICT',
    message,
    timestamp: new Date().toISOString(),
  });
};

// Server Error Response Format
export const serverErrorResponse = (res, message = 'Internal server error', details = null) => {
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message,
    details: process.env.NODE_ENV === 'development' ? details : null,
    timestamp: new Date().toISOString(),
  });
};
