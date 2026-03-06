# Rate Limit Configuration - Development Mode

## ✅ Update: Development Rate Limit = 1000

Semua endpoint sekarang memiliki rate limit **1000 requests** untuk development mode.

---

## 📊 Rate Limit Comparison

| Endpoint | Development | Production | Window |
|----------|-------------|------------|--------|
| **General API** | 1000/min | 30/min | 1 minute |
| **Auth** | 1000/15min | 10/15min | 15 minutes |
| **Billing Submit** | 1000/hour | 5/hour | 1 hour |
| **Billing View** | 1000/hour | 300/hour | 1 hour |
| **Admin Actions** | 1000/hour | 500/hour | 1 hour |
| **Admin Billing View** | 1000/hour | 1000/hour | 1 hour |
| **Admin Billing Write** | 1000/hour | 50/hour | 1 hour |
| **VPN Generate** | 1000/hour | 10/hour | 1 hour |

---

## 🔧 Configuration File

**File:** `backend/middleware/rateLimit.js`

```javascript
// Development mode: 1000 requests for all endpoints
export const rateLimiters = {
  billingSubmit: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 5,
  }),
  
  billingView: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 300,
  }),
  
  adminActions: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 500,
  }),
  
  adminBillingView: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 1000,
  }),
  
  adminBillingWrite: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 50,
  }),
  
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 1000 : 30,
  }),
  
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
  }),
  
  vpnGenerate: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 1000 : 10,
  }),
};
```

---

## 🎯 Benefits

### **Development Mode:**
- ✅ **1000 requests** - No rate limit errors during testing
- ✅ **Faster development** - No need to wait for limits to reset
- ✅ **Debug friendly** - Test all features without restrictions
- ✅ **Same code** - Production limits still enforced in production

### **Production Mode:**
- 🔒 **Strict limits** - Prevent abuse and spam
- 🔒 **Security** - Protect against brute force attacks
- 🔒 **Resource management** - Fair usage for all users
- 🔒 **Cost control** - Reduce Firebase read/write costs

---

## 🧪 Testing Rate Limits

### **Test with curl:**

```bash
# Rapid fire test (should not hit limit in dev)
for i in {1..100}; do
  curl -s http://localhost:3000/api/payment-settings/config | jq .
done

# Check rate limit headers
curl -I http://localhost:3000/api/payment-settings/config

# Response headers:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 999
# Retry-After: 60
```

### **Expected Behavior:**

**Development:**
```
Request 1-1000: ✅ 200 OK
Request 1001+:  ⚠️  429 Too Many Requests
```

**Production:**
```
Request 1-30:   ✅ 200 OK (general API)
Request 31+:    ⚠️  429 Too Many Requests
```

---

## 📝 Environment Detection

Backend automatically detects environment:

```bash
# Development
NODE_ENV=development  # → 1000 requests
npm run dev           # → Auto sets NODE_ENV=development

# Production
NODE_ENV=production   # → Production limits
npm start             # → Auto sets NODE_ENV=production
```

---

## 🔍 Rate Limit Headers

Every response includes rate limit info:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1678901234
Retry-After: 3600
```

---

## ⚠️ Important Notes

1. **In-Memory Store:** Rate limits use Map() (not Redis)
   - ✅ Fine for development/single instance
   - ⚠️ For production with multiple instances, use Redis

2. **Reset on Restart:** Rate limits reset when server restarts
   - Development: ✅ Convenient for testing
   - Production: ⚠️ Consider persistent store

3. **Auth Token Based:** Rate limit by user UID if authenticated
   - More accurate than IP-based
   - Prevents shared IP issues

---

## 🚀 Deployment Checklist

- [x] Development limits set to 1000
- [x] Production limits configured
- [x] Error messages updated
- [x] Headers enabled
- [ ] Consider Redis for production (optional)
- [ ] Monitor rate limit hits in production

---

## 📚 Related Files

- `backend/middleware/rateLimit.js` - Rate limit configuration
- `backend/server.js` - Middleware registration
- `backend/routes/*.js` - Endpoint-specific limiters

---

**Status:** ✅ All development rate limits set to 1000 requests
**Last Updated:** 2026-03-07
