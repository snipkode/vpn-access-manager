# 🔧 Rate Limit Fix - Admin Billing API

## 📋 Problem Analysis

### **Issue:** Rate limit sering kena pada endpoint `/api/admin/billing/*`

### **Root Causes:**

1. **Limit terlalu rendah (100 requests/jam)**
   - Dashboard admin melakukan multiple API calls per load
   - Auto-refresh setiap 30 detik = 120 requests/jam ❌

2. **Shared limit untuk semua admin endpoints**
   ```
   /api/admin/billing/payments       → 1 request
   /api/admin/billing/stats          → 1 request
   /api/admin/credit/transactions    → 1 request
   /api/admin/users                  → 1 request
   ─────────────────────────────────────────────
   Total: 4 requests × 30 dashboard refreshes = 120 requests/jam ❌
   ```

3. **Frontend polling untuk notification badge**
   - Poll setiap 10 detik = 360 requests/jam ❌

---

## ✅ Solution Implemented

### **1. Increased Rate Limits**

```javascript
// BEFORE
adminActions: {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,  // ❌ Too low!
}

// AFTER
adminActions: {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,  // ✅ Reasonable for admin usage
}

// NEW: Separate limiters for billing
adminBillingView: {
  windowMs: 60 * 60 * 1000,
  max: 1000,  // ✅ For frequent polling
}

adminBillingWrite: {
  windowMs: 60 * 60 * 1000,
  max: 50,  // ✅ Stricter for write operations
}
```

### **2. Endpoint-Specific Limiters**

| Endpoint | Method | Old Limiter | New Limiter | Limit |
|----------|--------|-------------|-------------|-------|
| `/api/admin/billing/payments` | GET | `adminActions` | `adminBillingView` | 1000/jam |
| `/api/admin/billing/payments/:id` | GET | ❌ None | `adminBillingView` | 1000/jam |
| `/api/admin/billing/payments/:id/approve` | POST | ❌ None | `adminBillingWrite` | 50/jam |
| `/api/admin/billing/payments/:id/reject` | POST | ❌ None | `adminBillingWrite` | 50/jam |
| `/api/admin/billing/billing/stats` | GET | ❌ None | `adminBillingView` | 1000/jam |
| `/api/admin/billing/payments/pending/count` | GET | ❌ None | `adminBillingView` | 1000/jam |

---

## 📊 New Rate Limits

### **Admin Rate Limits**

```javascript
// General admin actions (user management, etc.)
adminActions:        500 requests/hour

// Billing read operations (view payments, stats)
adminBillingView:    1000 requests/hour

// Billing write operations (approve/reject)
adminBillingWrite:   50 requests/hour
```

### **Usage Scenarios**

#### ✅ **Normal Dashboard Usage**
```
Load dashboard (5 API calls) × 60 times/hour = 300 requests/hour
Status: ✅ Within limit (1000/hour for view operations)
```

#### ✅ **Active Admin Approving Payments**
```
View payments: 100 requests/hour
Approve payments: 30 requests/hour
Status: ✅ Within limits
```

#### ❌ **Abuse Scenario**
```
Automated script: 2000 requests/hour
Status: ❌ BLOCKED (exceeds 1000/hour)
```

---

## 🎯 Recommendations for Frontend

### **1. Implement Smart Polling**

```javascript
// ❌ BAD: Poll every 5 seconds
setInterval(() => {
  fetch('/api/admin/billing/payments/pending/count');
}, 5000);

// ✅ GOOD: Poll every 30 seconds
setInterval(() => {
  fetch('/api/admin/billing/payments/pending/count');
}, 30000);

// ✅ BETTER: Use WebSocket or Server-Sent Events
const eventSource = new EventSource('/api/admin/billing/updates');
eventSource.onmessage = (event) => {
  updateBadgeCount(JSON.parse(event.data));
};
```

### **2. Cache API Responses**

```javascript
// Cache stats for 1 minute
const CACHE_DURATION = 60000;
let lastFetched = 0;
let cachedStats = null;

async function getStats() {
  const now = Date.now();
  if (now - lastFetched < CACHE_DURATION && cachedStats) {
    return cachedStats;
  }
  
  const response = await fetch('/api/admin/billing/billing/stats');
  cachedStats = await response.json();
  lastFetched = now;
  return cachedStats;
}
```

### **3. Debounce User Actions**

```javascript
// ❌ BAD: Approve on every click
button.addEventListener('click', () => approvePayment(id));

// ✅ GOOD: Debounce rapid clicks
const approveButton = debounce((id) => {
  approvePayment(id);
}, 500);
```

---

## 🔍 Monitoring

### **Check Rate Limit Headers**

Every response includes rate limit headers:

```
RateLimit-Limit: 1000
RateLimit-Remaining: 995
RateLimit-Reset: 1717660800
```

### **Handle 429 Responses**

```javascript
async function fetchWithRetry(url, options = {}) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = data.retryAfter || 60;
    
    console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Show user-friendly message
    showToast(`Too many requests. Please wait ${retryAfter} seconds.`, 'warning');
    
    // Retry after delay
    await sleep(retryAfter * 1000);
    return fetch(url, options);
  }
  
  return response;
}
```

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `middleware/rateLimit.js` | Added `adminBillingView` and `adminBillingWrite` limiters |
| `routes/admin-billing.js` | Updated all endpoints to use appropriate limiters |

---

## 🧪 Testing

### **Test Rate Limit**

```bash
# Install bombardier for load testing
go install github.com/codesenberg/bombardier@latest

# Test with 1000 requests over 1 minute
bombardier -c 10 -n 1000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/billing/payments
```

### **Expected Results**

```
✅ First 1000 requests: 200 OK
❌ After 1000 requests: 429 Too Many Requests
```

---

## 🚨 Troubleshooting

### **Still Getting Rate Limited?**

1. **Check your usage pattern**
   ```bash
   # Check logs for rate limit hits
   grep "Too many admin requests" logs/*.log
   ```

2. **Reduce polling frequency**
   - Notification badge: 30-60 seconds
   - Stats dashboard: 60 seconds
   - Payment list: On-demand only

3. **Consider development mode**
   ```bash
   # In development, limits are much higher
   NODE_ENV=development node server.js
   ```

### **False Positives**

If legitimate users are getting rate limited:

1. Increase limits in `middleware/rateLimit.js`
2. Implement user-based rate limiting (per UID instead of IP)
3. Add whitelist for trusted admin IPs

---

## 📚 References

- [express-rate-limit Documentation](https://www.npmjs.com/package/express-rate-limit)
- [Best Practices for API Rate Limiting](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/)
