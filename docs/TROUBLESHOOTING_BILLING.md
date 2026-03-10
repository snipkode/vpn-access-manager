# 🔧 Billing Enable Troubleshooting Guide

## 📅 March 6, 2026

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Frontend   │ ───► │   Backend    │ ───► │  Firebase       │
│  (React)    │      │  (Express)   │      │  Firestore      │
│             │      │              │      │                 │
│ apiFetch()  │      │ POST/PATCH   │      │ payment_settings│
│             │      │ /settings    │      │ /config         │
└─────────────┘      └──────────────┘      └─────────────────┘
     │                      │                      │
     │ Bearer Token         │ Firebase Admin       │ Document
     │                      │ SDK                  │ Update
```

---

## 🔍 Step-by-Step Debugging

### Step 1: Check Frontend → Backend Connection

**Test from Browser Console:**
```javascript
// 1. Get current token
const token = localStorage.getItem('auth_token'); // or wherever it's stored
console.log('Token:', token);

// 2. Test API call
fetch('http://localhost:3000/api/payment-settings/settings', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
.then(res => res.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
```

**Expected Response:**
```json
{
  "settings": {
    "billing_enabled": true,
    "currency": "IDR",
    ...
  },
  "bank_accounts": [...]
}
```

---

### Step 2: Check Backend Logs

**Start backend with logging:**
```bash
cd backend
npm start
```

**Watch for:**
```
✅ Backend running on port 3000
📊 Health: http://localhost:3000/health
```

**When you toggle billing, should see:**
```
PATCH /api/payment-settings/settings 200 - - ms
```

**If error:**
```
Error: Update settings error: ...
```

---

### Step 3: Test API Directly (curl)

**Get Settings:**
```bash
# Get token first (from browser console)
# Then test:
curl -X GET http://localhost:3000/api/payment-settings/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:**
```json
{
  "settings": {
    "billing_enabled": true,
    ...
  }
}
```

**Update Settings:**
```bash
curl -X PATCH http://localhost:3000/api/payment-settings/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"billing_enabled": true}'
```

**Expected:**
```json
{
  "message": "Payment settings updated",
  "settings": {
    "billing_enabled": true
  }
}
```

---

### Step 4: Check Firestore Directly

**Via Firebase Console:**
1. Go to https://console.firebase.google.com/
2. Select your project
3. Firestore Database → Data
4. Look for collection: `payment_settings`
5. Document: `config`
6. Check field: `billing_enabled`

**Via Firebase CLI:**
```bash
firebase firestore:get payment_settings/config
```

**Expected:**
```json
{
  "billing_enabled": true,
  "currency": "IDR",
  "min_amount": 10000,
  ...
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Unauthorized" Error

**Frontend:**
```
Error: Unauthorized
```

**Backend logs:**
```
Error: Invalid token
```

**Causes:**
- Token expired
- Token not sent
- Wrong token format

**Solutions:**
```javascript
// 1. Check token exists
const token = useAuthStore.getState().token;
console.log('Token:', token); // Should not be null

// 2. Check header format
headers: {
  'Authorization': `Bearer ${token}` // Must have "Bearer " prefix
}

// 3. Refresh token if expired
await firebase.auth().currentUser.getIdToken(true); // Force refresh
```

---

### Issue 2: "Admin access required" Error

**Response:**
```json
{
  "error": "Admin access required",
  "status": 403
}
```

**Cause:** User role is not "admin" in Firestore

**Solution:**
```javascript
// 1. Check user role in Firestore
// Firestore: users/{user_uid}/role

// 2. Update role to "admin"
// Via Firebase Console:
users → {user_uid} → role: "admin"

// 3. Or via script:
await db.collection('users').doc(uid).update({ role: 'admin' });
```

---

### Issue 3: "Failed to fetch" / Network Error

**Frontend:**
```
TypeError: Failed to fetch
```

**Causes:**
- Backend not running
- Wrong API URL
- CORS issue

**Solutions:**
```bash
# 1. Check backend running
curl http://localhost:3000/health

# 2. Check API URL in frontend
console.log(process.env.NEXT_PUBLIC_API_URL);
// Should be: http://localhost:3000/api

# 3. Create .env.local if not exists
echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" > .env.local

# 4. Restart frontend
npm run dev
```

---

### Issue 4: Toggle Works but Resets on Refresh

**Symptom:**
- Toggle shows ENABLED
- Refresh page → DISABLED again

**Causes:**
- Firestore update failed
- Reading from wrong document
- Cache issue

**Solutions:**

**1. Check backend actually updates Firestore:**
```javascript
// backend/routes/payment-settings.js
router.patch('/settings', verifyAdmin, async (req, res) => {
  const settingsRef = db.collection('payment_settings').doc('config');
  
  console.log('Updating Firestore:', req.body);
  
  if (!settingsDoc.exists) {
    await settingsRef.set({ ... });  // ← Is this called?
  } else {
    await settingsRef.update({ ... });  // ← Or this?
  }
  
  console.log('Update complete');
});
```

**2. Check Firestore rules:**
```javascript
// firestore.rules
match /payment_settings/{document} {
  allow read, write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**3. Clear cache:**
```bash
# Frontend
rm -rf .next
npm run dev

# Browser
Ctrl+Shift+R (Hard refresh)
```

---

### Issue 5: Billing Enabled but Payment Page Still Shows Error

**Symptom:**
- `billing_enabled: true` in Firestore
- Payment page shows "Billing disabled"

**Causes:**
- Frontend cache
- API not reading updated value
- Wrong document path

**Solutions:**

**1. Force refresh in frontend:**
```javascript
// PaymentSettings.js
const fetchData = async () => {
  const data = await apiFetch('/payment-settings/settings');
  console.log('Fresh data:', data.settings);
  setSettings(data.settings);
};
```

**2. Check API endpoint:**
```javascript
// backend/routes/billing.js
router.get('/plans', async (req, res) => {
  const settingsDoc = await db.collection('payment_settings').doc('config').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  
  console.log('Settings from /plans:', settings);
  
  if (!settings.billing_enabled) {
    return res.status(503).json({ error: 'Billing disabled' });
  }
  
  // ... return plans
});
```

**3. Test /plans endpoint:**
```bash
curl http://localhost:3000/api/billing/plans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return plans, not "Billing disabled" error.

---

## 🧪 Complete Test Flow

### 1. Enable Billing via Admin Panel
```
Admin Dashboard → Payment Settings → Toggle ENABLED → Save
```

### 2. Check Console Logs
```
📤 Toggle payload: { billing_enabled: true, ... }
📥 Update response: { message: 'Payment settings updated', ... }
```

### 3. Verify in Firestore
```
Firebase Console → Firestore → payment_settings/config
billing_enabled: true ✓
```

### 4. Test User Payment Page
```
Login as user → Payment page
Should see:
✓ Bank accounts
✓ Plan selection
✓ Submit form
✗ No "Billing disabled" error
```

### 5. Test API Endpoints
```bash
# Test /plans
curl http://localhost:3000/api/billing/plans \
  -H "Authorization: Bearer USER_TOKEN"

# Test /submit (with FormData)
curl -X POST http://localhost:3000/api/billing/submit \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "amount=50000" \
  -F "plan=monthly" \
  -F "bank_from=BCA" \
  -F "transfer_date=2026-03-06" \
  -F "proof=@receipt.jpg"
```

---

## 📊 Diagnostic Checklist

- [ ] Backend running on port 3000
- [ ] Frontend can reach backend (no CORS errors)
- [ ] Token is valid and sent with requests
- [ ] User has admin role in Firestore
- [ ] Firestore rules allow admin access
- [ ] `payment_settings/config` document exists
- [ ] `billing_enabled` field is `true`
- [ ] At least one active bank account exists
- [ ] Frontend refreshes data after update
- [ ] No console errors

---

## 🛠️ Quick Fix Commands

### Restart Everything
```bash
# Terminal 1 - Backend
cd backend
npm restart

# Terminal 2 - Frontend
cd frontend
rm -rf .next
npm run dev
```

### Force Firestore Update
```bash
cd backend
node scripts/enable-billing.js
```

### Clear All Caches
```bash
# Frontend build cache
cd frontend
rm -rf .next node_modules/.cache

# Browser cache
# Ctrl+Shift+Delete → Clear cache

# Firebase emulators (if using)
firebase emulators:stop
```

---

## 📞 Still Not Working?

### Enable Verbose Logging

**Backend:**
```javascript
// Add to backend/server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});
```

**Frontend:**
```javascript
// Already enabled in PaymentSettings.js
console.log('📤 Payload:', payload);
console.log('📥 Response:', response);
```

### Check Firestore Emulator vs Production

```javascript
// Make sure you're using the right Firestore instance
// backend/config/firebase.js

// Production:
const db = getFirestore(app);

// Emulator:
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

---

**Status:** Ready to debug  
**Tools:** Browser DevTools, Firebase Console, curl  
**Logs:** Frontend console, Backend logs, Firestore

**Last Updated:** March 6, 2026
