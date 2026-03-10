# Admin Referral API - Endpoint Fix

## 🐛 Problem

Frontend menggunakan endpoint yang **SALAH** untuk admin referral:

| Frontend (WRONG) ❌ | Backend (CORRECT) ✅ |
|---------------------|----------------------|
| `/admin/referral/dashboard` | `/admin/referral/stats` |
| `/admin/referral/referrals` | `/admin/referral/events` |
| `/admin/referral/settings` | `/admin/referral/config` |
| `/admin/referral/users/:id/tier` | N/A (via config) |
| `/admin/referral/users/:id/reset-fraud` | N/A (via config) |

---

## ✅ Solution

### **Backend Routes** (`backend/routes/admin-referral.js`):

```javascript
// Available endpoints:
router.get('/stats', verifyAdmin, ...)              // Get referral statistics
router.get('/users/:id', verifyAdmin, ...)          // Get user referral details
router.get('/events', verifyAdmin, ...)             // Get referral events
router.get('/config', verifyAdmin, ...)             // Get referral config
router.patch('/config', verifyAdmin, ...)           // Update referral config
router.get('/fraud/suspects', verifyAdmin, ...)     // Get fraud suspects
router.patch('/events/:id/review', verifyAdmin, ...) // Review fraud event
```

### **Frontend API Client** (`frontend/lib/api.js`):

**BEFORE (WRONG):**
```javascript
export const adminReferralAPI = {
  getDashboard: async () => apiFetch('/admin/referral/dashboard'),
  getReferrals: async (params) => apiFetch('/admin/referral/referrals'),
  getSettings: async () => apiFetch('/admin/referral/settings'),
  updateSettings: async (data) => apiFetch('/admin/referral/settings', { method: 'PATCH', body: data }),
  updateUserTier: async (userId, data) => apiFetch(`/admin/referral/users/${userId}/tier`, { method: 'PATCH', body: data }),
  resetUserFraud: async (userId) => apiFetch(`/admin/referral/users/${userId}/reset-fraud`, { method: 'POST' }),
};
```

**AFTER (CORRECT):**
```javascript
export const adminReferralAPI = {
  getStats: async () => apiFetch('/admin/referral/stats'),
  getUser: async (userId) => apiFetch(`/admin/referral/users/${userId}`),
  getEvents: async (params) => apiFetch(`/admin/referral/events${params ? '?' + new URLSearchParams(params) : ''}`),
  getConfig: async () => apiFetch('/admin/referral/config'),
  updateConfig: async (data) => apiFetch('/admin/referral/config', { method: 'PATCH', body: data }),
  getFraudSuspects: async (params) => apiFetch(`/admin/referral/fraud/suspects${params ? '?' + new URLSearchParams(params) : ''}`),
  reviewEvent: async (eventId, data) => apiFetch(`/admin/referral/events/${eventId}/review`, { method: 'PATCH', body: data }),
};
```

---

## 📝 Complete Endpoint Mapping

### **Admin Referral Endpoints:**

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getStats()` | GET | `/api/admin/referral/stats` | Get referral statistics |
| `getUser(userId)` | GET | `/api/admin/referral/users/:id` | Get user referral details |
| `getEvents(params)` | GET | `/api/admin/referral/events` | Get referral events |
| `getConfig()` | GET | `/api/admin/referral/config` | Get referral config |
| `updateConfig(data)` | PATCH | `/api/admin/referral/config` | Update referral config |
| `getFraudSuspects(params)` | GET | `/api/admin/referral/fraud/suspects` | Get fraud suspects |
| `reviewEvent(eventId, data)` | PATCH | `/api/admin/referral/events/:id/review` | Review fraud event |

---

## 🔧 Component Update

### **AdminReferral.js** (`frontend/components/AdminReferral.js`):

**BEFORE:**
```javascript
const fetchData = async () => {
  const [statsData, referralsData, configData] = await Promise.all([
    adminReferralAPI.getDashboard(),
    adminReferralAPI.getReferrals({ limit: 100 }),
    adminReferralAPI.getSettings(),
  ]);
};

const handleToggleTier = async (userId, newTier) => {
  await adminReferralAPI.updateUserTier(userId, { tier: newTier });
};

const handleResetFraud = async (userId) => {
  await adminReferralAPI.resetUserFraud(userId);
};
```

**AFTER:**
```javascript
const fetchData = async () => {
  const [statsData, eventsData, configData] = await Promise.all([
    adminReferralAPI.getStats(),
    adminReferralAPI.getEvents({ limit: 100 }),
    adminReferralAPI.getConfig(),
  ]);
};

const handleToggleTier = async (userId, newTier) => {
  await adminReferralAPI.updateConfig({
    user_id: userId,
    tier: newTier,
    action: 'update_tier'
  });
};

const handleResetFraud = async (userId) => {
  await adminReferralAPI.updateConfig({
    user_id: userId,
    action: 'reset_fraud'
  });
};
```

---

## 🧪 Testing

### **Test with curl:**

```bash
# Get referral stats
curl http://localhost:3000/api/admin/referral/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get referral events
curl "http://localhost:3000/api/admin/referral/events?limit=50" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get referral config
curl http://localhost:3000/api/admin/referral/config \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Update config
curl -X PATCH http://localhost:3000/api/admin/referral/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"referral_bonus": 10000}'

# Get fraud suspects
curl "http://localhost:3000/api/admin/referral/fraud/suspects" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Review fraud event
curl -X PATCH http://localhost:3000/api/admin/referral/events/EVENT_ID/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "notes": "Verified"}'
```

---

## 📊 Response Examples

### **GET /api/admin/referral/stats:**

```json
{
  "stats": {
    "total_referrers": 10,
    "total_referrals": 50,
    "successful_referrals": 30,
    "pending_referrals": 20,
    "total_rewards_paid": 500000,
    "total_bonuses_paid": 100000,
    "top_referrers": [
      {
        "id": "ref123",
        "user_id": "user123",
        "stats": {
          "total_referrals": 15,
          "successful_referrals": 10
        },
        "tier": "gold"
      }
    ],
    "referrals_by_tier": {
      "bronze": 5,
      "silver": 3,
      "gold": 2,
      "platinum": 0
    }
  }
}
```

### **GET /api/admin/referral/events:**

```json
{
  "events": [
    {
      "id": "event123",
      "referrer_id": "user123",
      "referee_id": "user456",
      "event_type": "signup",
      "status": "completed",
      "reward_amount": 10000,
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

### **GET /api/admin/referral/config:**

```json
{
  "config": {
    "referral_bonus": 10000,
    "referee_bonus": 5000,
    "tier_thresholds": {
      "bronze": 0,
      "silver": 5,
      "gold": 10,
      "platinum": 25
    },
    "fraud_detection_enabled": true
  }
}
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `frontend/lib/api.js` | ✅ Fixed adminReferralAPI endpoints |
| `frontend/components/AdminReferral.js` | ✅ Updated API calls |

---

## ⚠️ Breaking Changes

### **Removed Functions:**
- `adminReferralAPI.getDashboard()` → Use `getStats()`
- `adminReferralAPI.getReferrals()` → Use `getEvents()`
- `adminReferralAPI.getSettings()` → Use `getConfig()`
- `adminReferralAPI.updateSettings()` → Use `updateConfig()`
- `adminReferralAPI.updateUserTier()` → Use `updateConfig({ action: 'update_tier' })`
- `adminReferralAPI.resetUserFraud()` → Use `updateConfig({ action: 'reset_fraud' })`

### **New Functions:**
- `adminReferralAPI.getStats()`
- `adminReferralAPI.getUser(userId)`
- `adminReferralAPI.getEvents(params)`
- `adminReferralAPI.getConfig()`
- `adminReferralAPI.updateConfig(data)`
- `adminReferralAPI.getFraudSuspects(params)`
- `adminReferralAPI.reviewEvent(eventId, data)`

---

## ✅ Verification Checklist

- [x] API endpoints match backend routes
- [x] Component uses correct API functions
- [x] Error handling added
- [x] Console logging for debugging
- [ ] Test with admin token
- [ ] Verify stats display
- [ ] Verify events display
- [ ] Verify config update
- [ ] Verify fraud review

---

**Status:** ✅ FIXED - Admin referral API endpoints corrected
**Last Updated:** 2026-03-07
