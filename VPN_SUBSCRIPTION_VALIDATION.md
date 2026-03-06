# VPN Subscription Validation & Auto-Disable

## 📋 Overview

Sistem VPN sekarang memiliki **validasi subscription status** dan **auto-disable** untuk user yang expired.

---

## 🔒 VPN Endpoint Validation

### **Before (❌ NO VALIDATION):**

```javascript
// Only checked vpn_enabled flag
if (!userData.vpn_enabled) {
  return res.status(403).json({ error: 'VPN access not enabled' });
}

// ❌ No subscription expiry check!
// User with expired subscription could still generate configs
```

### **After (✅ WITH VALIDATION):**

```javascript
// Check vpn_enabled
if (!userData.vpn_enabled) {
  return res.status(403).json({ error: 'VPN access not enabled' });
}

// ✅ Check subscription expiry
const subscriptionEnd = userData.subscription_end 
  ? new Date(userData.subscription_end) 
  : null;

if (!subscriptionEnd || subscriptionEnd < now) {
  return res.status(403).json({
    error: 'Subscription expired',
    message: 'Your subscription has expired. Please top up to continue.',
    subscription_end: userData.subscription_end,
    expired_days: Math.floor((now - subscriptionEnd) / (1000 * 60 * 60 * 24)),
  });
}
```

---

## 🤖 Auto-Disable Expired Subscriptions

### **Cron Job: Daily at 10 AM**

**Before (❌ COMMENTED OUT):**
```javascript
// Disable VPN access for expired subscriptions (optional - can be configured)
// Uncomment if you want to auto-disable
// await db.collection('users').doc(doc.id).update({
//   vpn_enabled: false,
//   updated_at: new Date().toISOString(),
// });
```

**After (✅ ENABLED):**
```javascript
// Disable VPN access for expired subscriptions
await db.collection('users').doc(doc.id).update({
  vpn_enabled: false,
  updated_at: new Date().toISOString(),
});

console.log(`[Cron] Disabled VPN for ${userEmail} (expired: ${user.subscription_end})`);
```

---

## 🔄 Complete Flow

### **Flow 1: User with Active Subscription**

```
User requests VPN config
         ↓
System checks:
  1. vpn_enabled = true ✅
  2. subscription_end > now ✅
         ↓
Generate VPN config ✅
Return config + QR code
```

### **Flow 2: User with Expired Subscription**

```
User requests VPN config
         ↓
System checks:
  1. vpn_enabled = true ✅
  2. subscription_end < now ❌
         ↓
Return 403 Error:
{
  "error": "Subscription expired",
  "message": "Your subscription has expired. Please top up to continue.",
  "subscription_end": "2024-01-01T00:00:00.000Z",
  "expired_days": 15
}
```

### **Flow 3: Auto-Disable Cron (Daily 10 AM)**

```
Cron job runs at 10 AM
         ↓
Query users where:
  - vpn_enabled = true
  - subscription_end < now
         ↓
For each expired user:
  1. Send expired notification email
  2. Set vpn_enabled = false
  3. Log action
         ↓
User cannot generate new configs
Existing devices will not connect
```

---

## 📊 API Response Examples

### **Active Subscription:**

```json
{
  "device_id": "device123",
  "device_name": "iPhone 14",
  "ip_address": "10.0.0.2",
  "public_key": "wg_pubkey_...",
  "config": "[Interface]...",
  "qr": "data:image/png;base64,...",
  "subscription_end": "2024-02-15T00:00:00.000Z",
  "days_remaining": 30
}
```

### **Expired Subscription:**

```json
{
  "error": "Subscription expired",
  "message": "Your subscription has expired. Please top up to continue.",
  "subscription_end": "2024-01-01T00:00:00.000Z",
  "expired_days": 15
}
```

---

## 🕐 Cron Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Expiring Check | Daily 9 AM | Alert users expiring in 7/3/1 days |
| **Expired Check** | **Daily 10 AM** | **Disable VPN for expired users** |
| Admin Summary | Daily 8 AM | Send daily summary to admin |

---

## 🔍 Validation Points

### **Endpoint: POST /api/vpn/generate**

**Validations:**
1. ✅ User exists
2. ✅ `vpn_enabled` = true
3. ✅ `subscription_end` > now (NEW!)
4. ✅ Device count < MAX_DEVICES (3)

**Response includes:**
- VPN config
- QR code
- `subscription_end` (NEW!)
- `days_remaining` (NEW!)

---

## 📝 Database Changes

### **users collection:**

```javascript
{
  ...user_data,
  vpn_enabled: true,           // Updated by admin approval OR cron
  subscription_end: "2024-02-15T00:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z"
}
```

### **When subscription expires:**

```javascript
// Before cron run:
{
  vpn_enabled: true,
  subscription_end: "2024-01-01T00:00:00.000Z" // Expired
}

// After cron run:
{
  vpn_enabled: false,           // Auto-disabled
  subscription_end: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-16T10:00:00.000Z"
}
```

---

## 🧪 Testing Scenarios

### **Test 1: Active User Generate Config**

```
1. User with active subscription
2. POST /api/vpn/generate
3. Expected: ✅ Config generated
4. Response includes days_remaining
```

### **Test 2: Expired User Generate Config**

```
1. User with expired subscription
2. POST /api/vpn/generate
3. Expected: ❌ 403 Subscription expired
4. Error includes expired_days
```

### **Test 3: Auto-Disable Cron**

```
1. Set user.subscription_end to yesterday
2. Wait for cron (10 AM) OR run manually
3. Check user.vpn_enabled = false
4. Check email sent
5. User cannot generate new config
```

---

## 🔐 Security Benefits

### **Before:**
- ❌ User with expired subscription could still generate configs
- ❌ VPN access not automatically disabled
- ❌ Admin had to manually disable

### **After:**
- ✅ Subscription validated on every config generation
- ✅ Auto-disable at 10 AM daily
- ✅ Email notification sent
- ✅ Clear error messages to user

---

## ⚙️ Configuration

### **Disable Auto-Disable (Optional):**

If you want to manually control VPN disabling, comment out the auto-disable in `services/cronJobs.js`:

```javascript
// Comment out to disable auto-disable
// await db.collection('users').doc(doc.id).update({
//   vpn_enabled: false,
//   updated_at: new Date().toISOString(),
// });
```

### **Change Cron Schedule:**

Edit in Firestore `cron_settings/config`:
```javascript
{
  expired_check_schedule: "0 10 * * *" // Change time here
}
```

---

## 📊 Monitoring

### **Check Auto-Disable Logs:**

```bash
# Backend logs
tail -f backend/logs/app.log | grep "Disabled VPN"

# Or check console output
# [Cron] Disabled VPN for user@example.com (expired: 2024-01-01T00:00:00.000Z)
```

### **Check Expired Users:**

```javascript
// Firestore query
db.collection('users')
  .where('vpn_enabled', '==', false)
  .where('subscription_end', '<', new Date().toISOString())
```

---

## 🐛 Troubleshooting

### **Issue: Expired user can still generate config**

**Possible causes:**
1. Cron job not running
2. Cron schedule misconfigured
3. Email sending failed (prevents disable)

**Solution:**
```javascript
// Manually run expired check
node -e "require('./services/cronJobs.js').checkExpiredSubscriptions()"

// Or update user manually
db.collection('users').doc('USER_ID').update({
  vpn_enabled: false
});
```

### **Issue: Cron not running**

**Check:**
1. Backend server running
2. Cron job registered in `services/cronJobs.js`
3. Firestore `cron_settings/config` exists

---

## ✅ Implementation Checklist

### **Backend:**
- [x] Add subscription validation in `/api/vpn/generate`
- [x] Enable auto-disable in cron job
- [x] Add `subscription_end` to response
- [x] Add `days_remaining` to response
- [x] Log auto-disable actions

### **Frontend:**
- [ ] Display subscription expiry in Dashboard
- [ ] Show warning when expiring soon
- [ ] Redirect to Wallet when expired
- [ ] Show clear error message

---

## 📚 Related Files

| File | Changes |
|------|---------|
| `backend/routes/vpn.js` | ✅ Added subscription validation |
| `backend/services/cronJobs.js` | ✅ Enabled auto-disable |
| `backend/routes/billing.js` | ✅ Already calculates subscription |
| `backend/routes/admin-billing.js` | ✅ Updates subscription_end |

---

## 🎯 Summary

### **What Changed:**

1. **VPN Endpoint Validation:**
   - Now checks `subscription_end` date
   - Returns 403 if expired
   - Includes expiry info in response

2. **Auto-Disable Cron:**
   - Runs daily at 10 AM
   - Disables VPN for expired users
   - Sends notification email
   - Logs all actions

3. **User Experience:**
   - Clear error messages
   - Know exactly when expired
   - Know how to fix (top up)

---

**Status:** ✅ COMPLETE - VPN subscription validation & auto-disable implemented
**Last Updated:** 2026-03-07
