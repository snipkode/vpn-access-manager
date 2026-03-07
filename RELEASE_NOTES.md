# Release Notes - Balance Sync & Security Update

**Version:** v1.2.0  
**Date:** March 8, 2026  
**Commit:** 62a9070

---

## 🎯 Overview

Major update untuk memperbaiki masalah balance user yang tidak ter-update di UI, dengan implementasi real-time sync dan security hardening pada credit balance system.

---

## ✨ New Features

### 1. Real-Time Balance Sync
- **Firestore Listener**: Wallet component sekarang listen real-time changes ke `credit_balance`
- **Auto-Update**: Balance otomatis update saat admin approve payment
- **Manual Refresh**: User bisa refresh balance dengan klik tombol di card

### 2. Balance Sync API Endpoint
```
POST /api/credit/sync
```
- Recalculate balance dari payment history & transactions
- Firestore transaction untuk prevent race conditions
- Audit logging untuk semua sync operations

### 3. Manual Sync Script
```bash
node backend/scripts/sync-credit-balance.js
```
- Fix existing users yang balance-nya tidak sync
- Batch process semua users
- Report updated & errors

---

## 🔒 Security Improvements

### Input Validation
- ✅ UID format validation (regex: `^[a-zA-Z0-9_-]{10,50}$`)
- ✅ Type checking untuk semua query parameters
- ✅ Prevent injection attacks

### Authorization
- ✅ Users can only sync their own balance
- ✅ Admin-only sync for other users (with `?uid=` param)
- ✅ Role verification from Firestore

### Rate Limiting
- ✅ `rateLimiters.general` - 30 requests/minute (production)
- ✅ Prevent abuse & DDoS

### Audit Trail
```javascript
{
  action: 'credit_balance_sync',
  user_id: targetUid,
  requester_id: requesterUid,
  ip_address: userIP,
  old_balance: ...,
  new_balance: ...,
  synced: true/false,
  timestamp: ...,
  duration_ms: ...
}
```

### Data Protection
- ✅ Prevent negative balance
- ✅ Max balance limit: 1 billion IDR
- ✅ Information hiding (no balance disclosure in error responses)
- ✅ Generic error messages for users

### Race Condition Prevention
- ✅ Firestore transactions for atomic updates
- ✅ Lock mechanism during sync

---

## 🐛 Bug Fixes

### Fixed: Balance Not Updating in UI
**Problem:** Saat admin approve topup, balance di UI tidak ter-update

**Root Cause:**
1. Frontend tidak listen perubahan Firestore
2. userData.credit_balance tidak di-sync saat init
3. Profile API tidak include credit_balance

**Solution:**
1. Add Firestore onSnapshot listener
2. Fetch profile on mount to ensure credit_balance loaded
3. Update profile API to include credit_balance
4. Call sync API on refresh

---

## 📝 Changes

### Backend

#### `backend/routes/credit.js`
```diff
+ POST /api/credit/sync - Force sync balance with security
+ Firestore transaction for atomic updates
+ Audit logging
+ UID validation
+ Negative balance prevention
+ Max balance limit check
```

#### `backend/routes/admin-billing.js`
```diff
- Direct update for credit_balance
+ Firestore transaction for credit_balance update
+ Better logging for debugging
```

#### `backend/routes/user.js`
```diff
+ Include credit_balance in GET /api/user/profile response
```

#### `backend/functions/syncCreditBalance.js` (New)
- Cloud Function trigger on payment approval
- Auto-sync balance when payment status changed to 'approved'

#### `backend/scripts/sync-credit-balance.js` (New)
- Manual sync script for existing users
- Batch process all users
- Fix balance mismatches

### Frontend

#### `frontend/components/Wallet.js`
```diff
+ Real-time Firestore listener for credit_balance
+ Fetch profile on mount
+ Call sync API on refresh button click
+ Call sync API after topup success
+ Display balance from Zustand global state
+ Show "Last Updated" timestamp
```

#### `frontend/components/Toast.js`
```diff
- Emoji icons (✅, ❌, ⚠️, ℹ️, 📢)
+ Simple icons (✓, ✕, !, •)
+ Minimalist design
+ Smaller padding & cleaner look
```

#### `frontend/lib/api.js`
```diff
+ creditAPI.syncBalance() - Call sync endpoint
```

#### `frontend/pages/index.js`
```diff
+ Ensure credit_balance field on user init
```

---

## 🚀 Deployment

### 1. Backend
```bash
cd backend
pm2 restart vpn-api
```

### 2. Frontend
```bash
cd frontend
npm run build
pm2 restart frontend  # or however you deploy
```

### 3. Optional: Deploy Cloud Function
```bash
cd backend/functions
firebase deploy --only functions:syncCreditBalanceOnPayment
```

### 4. Fix Existing Users (One-time)
```bash
cd backend
node scripts/sync-credit-balance.js
```

---

## 🧪 Testing Checklist

- [ ] User can refresh balance by clicking refresh button
- [ ] Balance updates automatically after admin approves payment
- [ ] Sync API returns success for valid requests
- [ ] Non-admin cannot sync other users' balance
- [ ] Rate limiting works (test with multiple rapid requests)
- [ ] Negative balance is prevented
- [ ] Max balance limit is enforced
- [ ] Audit logs are created in Firestore
- [ ] Toast notifications display correctly
- [ ] No excessive console logs in production

---

## 📊 Metrics

### Code Changes
- **Files Modified:** 9
- **Insertions:** +439 lines
- **Deletions:** -51 lines
- **New Files:** 2 (sync script + cloud function)

### Security
- **Validations Added:** 5
- **Audit Logs:** 2 types (success + failed)
- **Rate Limiters:** 1 (general)

---

## 🔗 Related Issues

- Fix: Balance user belum ter update di UI
- Security: Add validation for credit sync endpoint
- Feature: Real-time balance update
- Cleanup: Remove excessive logging for production

---

## 📞 Support

Jika ada masalah atau pertanyaan mengenai update ini:
1. Check audit logs di Firestore collection `audit_logs`
2. Check backend logs: `pm2 logs vpn-api`
3. Run manual sync script jika ada user yang balance-nya tidak sync

---

**Released by:** Development Team  
**Approved by:** Tech Lead  
**Status:** ✅ Production Ready
