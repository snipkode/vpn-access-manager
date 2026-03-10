# 🔧 Billing System Enable Fix

## 📅 March 6, 2026

---

## 🐛 Problem

Payment system tidak aktif meskipun sudah di-enable di admin panel.

### Root Causes
1. ❌ `payment_settings` document belum ada di Firestore
2. ❌ Field `billing_enabled` tidak ter-set dengan benar
3. ❌ Bank accounts belum ada atau tidak active
4. ❌ Frontend tidak verify update dengan benar

---

## ✅ Solutions

### Solution 1: Enable via Script (RECOMMENDED)

**Script:** `backend/scripts/enable-billing.js`

```bash
cd backend
node scripts/enable-billing.js
```

**What it does:**
- ✅ Creates `payment_settings/config` document if not exists
- ✅ Sets `billing_enabled: true`
- ✅ Verifies the update
- ✅ Checks bank accounts
- ✅ Shows helpful messages

**Expected Output:**
```
🔧 Enabling Billing System...

📋 Current Settings:
   Billing Enabled: false
   Currency: IDR
   Min Amount: 10000
   Max Amount: 1000000

✅ Created new payment_settings document

📋 Updated Settings:
   Billing Enabled: true ✅
   Currency: IDR
   Min Amount: Rp 10.000
   Max Amount: Rp 1.000.000
   Auto Approve: false
   Updated At: 2026-03-06T...

🏦 Checking Bank Accounts...
   ✅ Found 2 bank account(s)
   ✅ 2 active bank account(s) ready for payments

✅ Billing System Enabled Successfully!
```

---

### Solution 2: Enable via Admin Dashboard

**Steps:**
1. Login sebagai admin
2. Navigate to **Payment Settings**
3. Click tab **General**
4. Toggle **Billing System** to ENABLED
5. Click **Save Settings**
6. Verify toggle stays enabled

**Updated Logic:**
```javascript
// Now with verification
const handleToggleBilling = async () => {
  const newStatus = !settings.billing_enabled;
  
  // 1. Update settings
  await apiFetch('/payment-settings/settings', {
    method: 'PATCH',
    body: JSON.stringify({ 
      billing_enabled: newStatus,
      currency: settings.currency,
      min_amount: settings.min_amount,
      max_amount: settings.max_amount,
    }),
  });
  
  // 2. Verify update
  const data = await apiFetch('/payment-settings/settings');
  
  if (data.settings.billing_enabled === newStatus) {
    showNotification(`Billing ${newStatus ? 'ENABLED' : 'DISABLED'} successfully!`);
  } else {
    throw new Error('Failed to verify billing status');
  }
};
```

---

### Solution 3: Manual Firestore Update

**Via Firebase Console:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Click **Start collection**
   - Collection ID: `payment_settings`
   - Document ID: `config`
5. Add fields:
   ```
   billing_enabled: true (boolean)
   currency: "IDR" (string)
   min_amount: 10000 (number)
   max_amount: 1000000 (number)
   auto_approve: false (boolean)
   created_at: "2026-03-06T..." (string)
   updated_at: "2026-03-06T..." (string)
   ```

---

## 📝 Backend Fix

### Updated Endpoint: `PATCH /payment-settings/settings`

**Before:**
```javascript
// Only updates provided fields
await settingsRef.update(updateData);
```

**After:**
```javascript
// Ensures billing_enabled is properly set
const updateData = {
  updated_at: new Date().toISOString(),
  updated_by: req.user.uid,
};

if (billing_enabled !== undefined) {
  updateData.billing_enabled = billing_enabled;
}

// ... other fields

if (!settingsDoc.exists) {
  await settingsRef.set({
    created_at: new Date().toISOString(),
    ...updateData,
  });
} else {
  await settingsRef.update(updateData);
}
```

---

## 🏦 Bank Accounts Setup

### Requirement
Billing system requires at least **one active bank account**.

### Add Bank Account via Admin Dashboard

1. Login sebagai admin
2. Navigate to **Payment Settings**
3. Click tab **Bank Accounts**
4. Click **Add Bank**
5. Fill in:
   - Bank Name (e.g., "BCA")
   - Account Number
   - Account Name
   - Description (optional)
   - QR Code URL (optional)
   - Order (display order)
   - Active: ✅ ON
6. Click **Save Bank**

### Bank Account Document Structure
```javascript
{
  bank: "BCA",
  account_number: "1234567890",
  account_name: "PT VPN Access",
  description: "Transfer ke rekening ini",
  qr_code_url: "https://...",
  active: true,
  order: 0,
  created_at: "2026-03-06T...",
  created_by: "admin_uid",
  updated_at: "2026-03-06T...",
}
```

---

## 🧪 Verification Steps

### 1. Check Settings Document
```bash
node scripts/enable-billing.js
```

### 2. Check via API
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/payment-settings/settings
```

**Expected Response:**
```json
{
  "settings": {
    "billing_enabled": true,
    "currency": "IDR",
    "min_amount": 10000,
    "max_amount": 1000000,
    "auto_approve": false
  },
  "bank_accounts": [
    {
      "id": "bank_id",
      "bank": "BCA",
      "account_number": "1234567890",
      "account_name": "PT VPN Access",
      "active": true
    }
  ]
}
```

### 3. Test Payment Page
1. Login sebagai user (bukan admin)
2. Navigate to **Payment** page
3. Should see:
   - ✅ Bank accounts displayed
   - ✅ Plan selection enabled
   - ✅ Submit form available
   - ✅ No "Payment System Unavailable" message

---

## 🔍 Troubleshooting

### Issue 1: Toggle doesn't stay enabled

**Symptoms:**
- Toggle turns off after page refresh
- API returns `billing_enabled: false`

**Solution:**
```bash
# Run enable script
node scripts/enable-billing.js

# Or manually set in Firestore
# See Solution 3 above
```

---

### Issue 2: "Billing disabled" error

**Symptoms:**
```json
{
  "error": "Billing disabled",
  "message": "Payment functionality is currently unavailable"
}
```

**Solution:**
1. Check `payment_settings/config` exists
2. Verify `billing_enabled: true`
3. Check bank accounts exist and active
4. Restart backend server

---

### Issue 3: No bank accounts showing

**Symptoms:**
- Payment page shows but no bank accounts
- Cannot submit payment

**Solution:**
```bash
# Add bank account via script or admin dashboard
# Admin Dashboard → Payment Settings → Bank Accounts → Add Bank
```

**Minimum bank account:**
```javascript
{
  bank: "BCA",
  account_number: "1234567890",
  account_name: "PT VPN Access",
  active: true
}
```

---

### Issue 4: Permission denied

**Symptoms:**
```json
{
  "error": "Admin access required"
}
```

**Solution:**
- Ensure user has `role: "admin"` in Firestore
- Check token is valid
- Token must be from admin account

**Set admin role:**
```javascript
// In Firestore Console
// users/{user_uid}
{
  email: "admin@example.com",
  role: "admin",  // ← Change from "user" to "admin"
  ...
}
```

---

## 📊 Checklist

### Enable Billing System
- [ ] Run `node scripts/enable-billing.js`
- [ ] Verify `billing_enabled: true` in Firestore
- [ ] Verify via API endpoint
- [ ] Restart backend server

### Setup Bank Accounts
- [ ] Add at least one bank account
- [ ] Set `active: true`
- [ ] Verify in admin dashboard
- [ ] Verify in user payment page

### Test Payment Flow
- [ ] User can see payment page
- [ ] Bank accounts displayed
- [ ] Can select plan
- [ ] Can upload proof
- [ ] Can submit payment
- [ ] Admin can see pending payment
- [ ] Admin can approve/reject

---

## 🎯 Quick Fix Commands

### Enable Billing
```bash
cd backend
node scripts/enable-billing.js
```

### Check Settings
```bash
curl http://localhost:3000/api/payment-settings/settings \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### View Firestore (via Firebase CLI)
```bash
firebase firestore:get payment_settings/config
```

---

## 📝 Prevention

### Always do this after deploy:
1. Run enable billing script
2. Verify settings in Firestore
3. Test payment flow
4. Check bank accounts

### Monitoring:
- Check `billing_enabled` status daily
- Monitor pending payments
- Verify bank accounts are active

---

## ✅ Success Indicators

### Firestore Document
```
payment_settings/
  └─ config/
      ├─ billing_enabled: true ✅
      ├─ currency: "IDR"
      ├─ min_amount: 10000
      ├─ max_amount: 1000000
      └─ updated_at: "2026-03-06T..."
```

### Bank Accounts
```
bank_accounts/
  ├─ {bank_id_1}/
  │   ├─ active: true ✅
  │   └─ ...
  └─ {bank_id_2}/
      ├─ active: true ✅
      └─ ...
```

### User Payment Page
```
✅ Bank accounts displayed
✅ Plan selection working
✅ Submit form enabled
✅ No error messages
```

### Admin Dashboard
```
✅ Billing toggle shows ENABLED
✅ Bank accounts listed
✅ Can approve/reject payments
✅ Payment statistics updating
```

---

## 📞 Support

If still having issues:

1. **Check backend logs:**
   ```bash
   cd backend
   npm start
   # Watch for errors
   ```

2. **Check Firestore rules:**
   ```javascript
   match /payment_settings/{document} {
     allow read, write: if request.auth != null && 
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
   }
   ```

3. **Verify Firebase Admin SDK:**
   ```bash
   cd backend
   node -e "const admin = require('firebase-admin'); console.log(admin.SDK_VERSION);"
   ```

---

**Status:** ✅ FIX AVAILABLE  
**Script:** `backend/scripts/enable-billing.js`  
**UI Fix:** Updated PaymentSettings component  
**Documentation:** Complete

**Last Updated:** March 6, 2026
