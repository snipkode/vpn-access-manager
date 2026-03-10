# Billing Settings Sync Fix - Unified Collection

## 🔍 Problem Identified

Admin endpoint dan user endpoint menggunakan **Firestore collections yang berbeda**:

| Endpoint | Collection | Document |
|----------|-----------|----------|
| `PATCH /api/admin/settings/billing` | `settings` | `billing` |
| `GET /api/payment-settings/config` | `payment_settings` | `config` |

**Akibat:** Ketika admin update billing settings via `/api/admin/settings/billing`, perubahan **TIDAK** berdampak ke user payment system karena user membaca dari collection yang berbeda.

---

## ✅ Solution Implemented

**Unified Collection Approach** - Admin dan user sekarang menggunakan collection yang sama: `payment_settings/config`

### Changes Made

#### 1. **Backend: `/routes/settings.js`**

**GET `/api/admin/settings/billing`** - Now reads from `payment_settings/config`:
```javascript
router.get('/:category', verifyAdmin, async (req, res) => {
  const { category } = req.params;
  
  // Use unified collection for billing category
  let doc;
  if (category === 'billing') {
    doc = await db.collection('payment_settings').doc('config').get();
  } else {
    doc = await db.collection('settings').doc(category).get();
  }
  // ...
});
```

**PATCH `/api/admin/settings/billing`** - Now writes to `payment_settings/config`:
```javascript
router.patch('/billing', verifyAdmin, async (req, res) => {
  // Use unified collection: payment_settings (same as user-facing endpoint)
  const settingsRef = db.collection('payment_settings').doc('config');
  // ...
  
  // Also update legacy settings/billing for backward compatibility
  try {
    const legacyRef = db.collection('settings').doc('billing');
    // ...sync legacy data
  } catch (legacyError) {
    console.warn('⚠️ Failed to update legacy settings/billing:', legacyError.message);
  }
});
```

**GET `/api/admin/settings`** (all settings) - Billing category now reads from `payment_settings`:
```javascript
router.get('/', verifyAdmin, async (req, res) => {
  for (const category of categories) {
    let doc;
    if (category === 'billing') {
      doc = await db.collection('payment_settings').doc('config').get();
    } else {
      doc = await db.collection('settings').doc(category).get();
    }
    // ...
  }
});
```

---

## 📊 Data Flow (After Fix)

```
Admin PATCH /api/admin/settings/billing
         ↓
Writes to: payment_settings/config
         ↓
Also syncs to: settings/billing (legacy, for backward compatibility)
         ↓
User GET /api/payment-settings/config
         ↓
Reads from: payment_settings/config ✅ SAME COLLECTION!
```

---

## 🧪 Testing

### Test 1: Admin Update
```bash
curl 'https://solusikonsep.co.id:4443/api/admin/settings/billing' \
  -X 'PATCH' \
  -H 'Authorization: Bearer <ADMIN_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "billing_enabled": true,
    "min_topup": 50000,
    "max_topup": 1000000,
    "auto_renewal_enabled": true,
    "low_balance_days": 5
  }'
```

### Test 2: User Check
```bash
curl 'https://solusikonsep.co.id:4443/api/payment-settings/config' \
  -H 'Authorization: Bearer <USER_TOKEN>'
```

**Expected:** User endpoint should reflect the admin's updates immediately.

---

## 📝 Migration Steps

### Option 1: Manual Sync (Recommended)
Run this one-time script to sync existing data:

```javascript
// Run in Firebase Console or Cloud Functions
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function syncBillingSettings() {
  // Get legacy settings
  const legacyDoc = await db.collection('settings').doc('billing').get();
  const legacyData = legacyDoc.exists ? legacyDoc.data() : {};
  
  // Get current payment_settings
  const paymentDoc = await db.collection('payment_settings').doc('config').get();
  const paymentData = paymentDoc.exists ? paymentDoc.data() : {};
  
  // Merge (payment_settings takes precedence)
  const merged = {
    ...legacyData,
    ...paymentData,
    updated_at: new Date().toISOString(),
    updated_by: 'migration-script',
  };
  
  await db.collection('payment_settings').doc('config').set(merged, { merge: true });
  console.log('✅ Sync complete');
}
```

### Option 2: Let Next Admin Update Handle It
The next time admin updates billing settings via `/api/admin/settings/billing`, it will automatically write to `payment_settings/config`.

---

## 🔧 Backward Compatibility

Legacy collection `settings/billing` is still maintained for:
- Other admin endpoints that might read from it
- Historical data reference
- Fallback if needed

The sync is handled automatically in the `PATCH /billing` endpoint.

---

## ✅ Verification Checklist

- [ ] Admin can GET `/api/admin/settings/billing` and see correct data
- [ ] Admin can PATCH `/api/admin/settings/billing` successfully
- [ ] User can GET `/api/payment-settings/config` and see updated data
- [ ] `billing_enabled` flag is consistent across both endpoints
- [ ] `min_topup` and `max_topup` values match
- [ ] Payment form shows/hides based on admin settings
- [ ] No breaking changes to existing admin UI

---

## 📌 Related Files

- `/backend/routes/settings.js` - Admin settings endpoints (UPDATED)
- `/backend/routes/payment-settings.js` - User payment settings endpoints
- `/frontend/lib/api.js` - API client (no changes needed)
- `/frontend/components/Payment.js` - User payment UI (no changes needed)
- `/frontend/components/AdminBilling.js` - Admin billing UI (no changes needed)

---

## 🚀 Deployment

1. Deploy backend changes
2. Run migration script (Option 1) OR wait for next admin update
3. Test admin endpoint: `GET /api/admin/settings/billing`
4. Test user endpoint: `GET /api/payment-settings/config`
5. Verify both return same `billing_enabled` value
6. Test payment form visibility for users

---

**Status:** ✅ Complete  
**Date:** 2026-03-07  
**Impact:** Admin billing updates now immediately affect user payment system
