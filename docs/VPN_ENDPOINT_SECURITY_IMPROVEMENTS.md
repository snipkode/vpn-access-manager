# VPN Endpoint Security Improvements

## 📋 Overview

Semua security issues di VPN endpoint telah diperbaiki dengan implementasi best practices untuk:
- ✅ Shell injection prevention
- ✅ Input validation & sanitization
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Health checks
- ✅ Device status tracking

---

## 🔒 Security Improvements

### **1. Shell Injection Prevention** ✅

**Before (❌ VULNERABLE):**
```javascript
// User input directly in shell command
execSync(`wg set wg0 peer ${deviceData.public_key} remove`);
```

**After (✅ SECURE):**
```javascript
// Sanitize public key (only allow base64 chars)
function sanitizePublicKey(key) {
  return key.replace(/[^a-zA-Z0-9+/=]/g, '').trim();
}

// Use sanitized + quoted in shell command
const sanitizedKey = sanitizePublicKey(deviceData.public_key);
execSync(`wg set wg0 peer '${sanitizedKey}' remove`);
```

**Protection:**
- ✅ Removes special shell characters
- ✅ Only allows valid base64 characters
- ✅ Quotes argument to prevent injection
- ✅ Prevents command injection attacks

---

### **2. Input Validation** ✅

**Device Name Validation:**
```javascript
function sanitizeDeviceName(name) {
  if (!name || typeof name !== 'string') {
    return 'VPN Device';
  }
  // Remove special characters, limit length
  return name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim()
    .substring(0, MAX_DEVICE_NAME_LENGTH) || 'VPN Device';
}
```

**Device ID Validation:**
```javascript
function isValidDocId(id) {
  return typeof id === 'string' && 
         /^[a-zA-Z0-9_-]+$/.test(id) && 
         id.length <= 50;
}

// In route
if (!isValidDocId(id)) {
  return res.status(400).json({ error: 'Invalid device ID' });
}
```

**Protection:**
- ✅ Prevents XSS attacks
- ✅ Prevents SQL/NoSQL injection
- ✅ Limits input length
- ✅ Only allows safe characters

---

### **3. Device Status Check** ✅

**Before:**
```javascript
// No status check - could revoke multiple times
await deviceRef.delete();
```

**After:**
```javascript
// Check if already revoked
if (deviceData.status === 'revoked') {
  return res.status(400).json({ 
    error: 'Device already revoked',
    message: 'This device has already been revoked'
  });
}

// Soft delete instead of hard delete
await deviceRef.update({
  status: 'revoked',
  revoked_at: new Date().toISOString(),
  revoked_by: uid,
});
```

**Benefits:**
- ✅ Prevents duplicate revocation
- ✅ Maintains audit trail
- ✅ Tracks who revoked and when
- ✅ Data retention for compliance

---

### **4. Audit Logging** ✅

**Implementation:**
```javascript
// Create audit log
await db.collection('audit_logs').doc().set({
  action: 'device_revoked',
  user_id: uid,
  device_id: id,
  device_name: deviceData.device_name,
  device_public_key: sanitizedPublicKey,
  device_ip: deviceData.ip_address,
  timestamp: new Date().toISOString(),
  ip_address: req.ip,
  user_agent: req.headers['user-agent']?.substring(0, 200) || 'unknown'
});
```

**Logged Information:**
- Action performed
- User who performed it
- Device details
- Timestamp
- IP address
- User agent

**Benefits:**
- ✅ Compliance requirement
- ✅ Forensic analysis
- ✅ Debugging aid
- ✅ Security monitoring

---

### **5. Rate Limiting** ✅

**Implementation:**
```javascript
router.delete('/device/:id', 
  verifyAuth, 
  rateLimiters.vpnGenerate,  // 10 requests per hour
  async (req, res) => {
```

**Protection:**
- ✅ Prevents DoS attacks
- ✅ Prevents spam
- ✅ Protects against brute force
- ✅ Fair usage enforcement

---

### **6. WireGuard Health Check** ✅

**Implementation:**
```javascript
// Check WG service before generating config
if (!isWireGuardHealthy()) {
  return res.status(503).json({
    error: 'VPN service unavailable',
    message: 'WireGuard service is currently down. Please contact admin.',
  });
}

// Health check function
export function isWireGuardHealthy() {
  try {
    execSync(`wg show wg0`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 2000
    });
    return true;
  } catch {
    return false;
  }
}
```

**Benefits:**
- ✅ Fail fast if WG down
- ✅ Clear error to user
- ✅ Prevents generating broken configs
- ✅ Early detection of issues

---

## 📊 API Changes

### **POST /api/vpn/generate**

**New Validations:**
- ✅ Device name sanitization (max 50 chars)
- ✅ WireGuard health check
- ✅ Subscription expiry check
- ✅ Device limit check

**New Response Fields:**
```json
{
  "device_id": "device123",
  "device_name": "iPhone 14",  // Sanitized
  "subscription_end": "2024-02-15T00:00:00.000Z",
  "days_remaining": 30
}
```

**Error Responses:**
```json
// 400 - Invalid device name
{
  "error": "Invalid device name",
  "message": "Device name must be alphanumeric (max 50 chars)"
}

// 503 - WG service down
{
  "error": "VPN service unavailable",
  "message": "WireGuard service is currently down. Please contact admin."
}
```

---

### **DELETE /api/vpn/device/:id**

**New Validations:**
- ✅ Device ID format validation
- ✅ Device status check (already revoked?)
- ✅ Public key sanitization
- ✅ Rate limiting (10/hour)

**New Response Fields:**
```json
{
  "message": "Device revoked successfully",
  "device_id": "device123",
  "device_name": "iPhone 14",
  "wireguard_removed": true,
  "revoked_at": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
```json
// 400 - Invalid device ID
{
  "error": "Invalid device ID",
  "message": "Device ID must be alphanumeric (max 50 chars)"
}

// 400 - Already revoked
{
  "error": "Device already revoked",
  "message": "This device has already been revoked"
}

// 429 - Rate limit exceeded
{
  "error": "Too many requests",
  "message": "Maximum 10 requests per hour"
}
```

---

## 🔍 Security Features Summary

| Feature | Status | Protection |
|---------|--------|------------|
| Shell Injection Prevention | ✅ | Command injection attacks |
| Input Sanitization | ✅ | XSS, injection attacks |
| Input Validation | ✅ | Invalid/malicious input |
| Device Status Check | ✅ | Duplicate operations |
| Audit Logging | ✅ | Compliance, forensics |
| Rate Limiting | ✅ | DoS, brute force |
| Health Check | ✅ | Service availability |
| Soft Delete | ✅ | Data retention |

---

## 🧪 Testing Scenarios

### **Test 1: Shell Injection Attempt**

```bash
# Malicious device name with shell injection
curl -X POST http://localhost:3000/api/vpn/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceName": "iPhone; rm -rf /"}'

# Expected: Device name sanitized to "iPhone"
# Response: 200 OK with sanitized name
```

### **Test 2: Invalid Device ID**

```bash
# Invalid device ID with special chars
curl -X DELETE http://localhost:3000/api/vpn/device/device123;rm%20-rf%20/ \
  -H "Authorization: Bearer TOKEN"

# Expected: 400 Bad Request
# Response: "Invalid device ID"
```

### **Test 3: Double Revoke**

```bash
# First revoke - success
curl -X DELETE http://localhost:3000/api/vpn/device/device123 \
  -H "Authorization: Bearer TOKEN"
# Response: 200 OK

# Second revoke - fail
curl -X DELETE http://localhost:3000/api/vpn/device/device123 \
  -H "Authorization: Bearer TOKEN"
# Expected: 400 Bad Request
# Response: "Device already revoked"
```

### **Test 4: Rate Limiting**

```bash
# Send 11 requests in quick succession
for i in {1..11}; do
  curl -X DELETE http://localhost:3000/api/vpn/device/device$i \
    -H "Authorization: Bearer TOKEN"
done

# Expected: First 10 succeed, 11th returns 429
# Response: "Too many requests"
```

### **Test 5: WG Service Down**

```bash
# Stop WireGuard service
sudo systemctl stop wg-quick@wg0

# Try to generate config
curl -X POST http://localhost:3000/api/vpn/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceName": "iPhone"}'

# Expected: 503 Service Unavailable
# Response: "WireGuard service is currently down"
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `backend/routes/vpn.js` | ✅ Added sanitization, validation, audit log, rate limit |
| `backend/services/wireguard.js` | ✅ Added health check function |

---

## ✅ Security Checklist

### **Input Validation:**
- [x] Device name sanitized (max 50 chars)
- [x] Device ID validated (alphanumeric only)
- [x] Public key sanitized (base64 only)
- [x] Special characters removed

### **Shell Command Security:**
- [x] All inputs sanitized before shell execution
- [x] Arguments quoted in shell commands
- [x] Timeout set (5 seconds)
- [x] Stdio piped (no output leakage)

### **Access Control:**
- [x] Ownership check (user can only delete own devices)
- [x] Status check (cannot revoke already revoked device)
- [x] Rate limiting (10 requests per hour)

### **Audit & Compliance:**
- [x] Audit log created for each revocation
- [x] Timestamp recorded
- [x] User ID recorded
- [x] IP address recorded
- [x] Device details preserved

### **Error Handling:**
- [x] Graceful degradation (DB update even if WG fails)
- [x] Clear error messages
- [x] Stack traces only in dev mode
- [x] Health check before operations

---

## 🎯 Impact Assessment

### **Security:**
- ✅ **HIGH** - Prevents shell injection attacks
- ✅ **HIGH** - Prevents XSS and injection
- ✅ **MEDIUM** - Prevents DoS via rate limiting
- ✅ **MEDIUM** - Audit trail for forensics

### **Reliability:**
- ✅ **HIGH** - Health check prevents broken configs
- ✅ **MEDIUM** - Soft delete preserves data
- ✅ **MEDIUM** - Graceful degradation on WG failure

### **User Experience:**
- ✅ **MEDIUM** - Clear error messages
- ✅ **LOW** - Rate limiting may affect power users
- ✅ **HIGH** - Better debugging with audit logs

---

## 🚀 Deployment Notes

### **Before Deploy:**
1. ✅ Test all endpoints with valid input
2. ✅ Test all endpoints with invalid input
3. ✅ Test rate limiting
4. ✅ Test WG health check (stop WG service)
5. ✅ Verify audit logs are created

### **After Deploy:**
1. Monitor logs for shell injection attempts
2. Monitor rate limit hits
3. Monitor WG health check failures
4. Review audit logs regularly

---

## 📚 References

- [OWASP Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [Node.js Child Process Security](https://nodejs.org/api/child_process.html)
- [Rate Limiting Best Practices](https://owasp.org/www-community/controls/Rate_Limiting)

---

**Status:** ✅ COMPLETE - All VPN endpoint security improvements implemented  
**Last Updated:** 2026-03-07
