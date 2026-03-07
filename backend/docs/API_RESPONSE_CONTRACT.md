# Standard API Response Contract

## Overview

All API endpoints in the VPN Access Manager follow a standardized response format for consistency and ease of use.

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Actual response data
  },
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error details (optional)
  },
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

### Pagination Response

```json
{
  "success": true,
  "message": "Success",
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

## HTTP Status Codes

| Code | Error Code | Description |
|------|------------|-------------|
| 200 | - | Success |
| 201 | - | Created |
| 400 | `VALIDATION_ERROR` | Bad Request / Validation Failed |
| 401 | `UNAUTHORIZED` | Unauthorized - Invalid or missing token |
| 403 | `FORBIDDEN` | Forbidden - Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMIT` | Too many requests |
| 500 | `INTERNAL_ERROR` | Internal server error |

## Error Codes

### Authentication Errors

```json
// 401 Unauthorized
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid token",
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

### Authorization Errors

```json
// 403 Forbidden
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Admin access required",
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

### Validation Errors

```json
// 400 Bad Request
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

### Rate Limit Errors

```json
// 429 Too Many Requests
{
  "success": false,
  "error": "RATE_LIMIT",
  "message": "Too many requests",
  "retryAfter": 3600,
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1710000000
```

### Not Found Errors

```json
// 404 Not Found
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Device not found",
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

### Server Errors

```json
// 500 Internal Server Error
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "Internal server error",
  "details": "Only shown in development mode",
  "timestamp": "2026-03-07T10:00:00.000Z"
}
```

## Frontend Usage

### Basic API Call

```javascript
import { vpnAPI } from '../lib/api';

// Success response - returns data directly
const devices = await vpnAPI.getDevices();
// devices = [{ id: '1', device_name: 'iPhone', ... }]

// Error handling
try {
  await vpnAPI.generateConfig('iPhone');
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    showNotification(`Wait ${error.retryAfter} seconds`);
  } else {
    showNotification(error.message);
  }
}
```

### Response Structure in Frontend

```javascript
// Backend returns:
{
  "success": true,
  "message": "Success",
  "data": { devices: [...] },
  "timestamp": "..."
}

// Frontend receives (auto-extracted):
{ devices: [...] }
```

## Backend Usage

### Using Response Utilities

```javascript
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '../utils/apiResponse.js';

// Success
router.get('/devices', async (req, res) => {
  const devices = await getDevices();
  return successResponse(res, { devices }, 'Devices retrieved');
});

// Error
router.get('/device/:id', async (req, res) => {
  const device = await getDevice(req.params.id);
  if (!device) {
    return notFoundResponse(res, 'Device not found');
  }
  return successResponse(res, { device });
});

// Validation
router.post('/device', async (req, res) => {
  const errors = validateDevice(req.body);
  if (errors.length > 0) {
    return validationErrorResponse(res, errors);
  }
  // ... create device
});
```

## Migration Guide

### Old Backend Response
```javascript
res.json({ devices });
```

### New Backend Response
```javascript
successResponse(res, { devices }, 'Devices retrieved');
```

### Old Frontend Error Handling
```javascript
catch (error) {
  showNotification(error.message);
}
```

### New Frontend Error Handling
```javascript
catch (error) {
  if (error.code === 'RATE_LIMIT') {
    showNotification(`⏱️ Wait ${error.retryAfter}s`);
  } else {
    showNotification(error.message);
  }
}
```

## Benefits

1. **Consistency** - All endpoints follow the same format
2. **Type Safety** - Predictable response structure
3. **Error Handling** - Standardized error codes and messages
4. **Debugging** - Timestamp and structured errors
5. **Frontend Integration** - Auto-extract data from responses
6. **Rate Limiting** - Standard headers and retry information

## Files

- Backend: `backend/utils/apiResponse.js`
- Frontend: `frontend/lib/api.js`
- Documentation: `backend/docs/API_RESPONSE_CONTRACT.md`
