# Payment Submit: Top Up vs Subscription Separation

## ✅ Changes Implemented

### **Problem:**
Payment form tidak memisahkan antara **Top Up** (tambah saldo) dan **Subscription** (beli paket). Akibatnya:
- User bingung mau topup atau beli paket
- Backend error karena validasi plan tidak cocok untuk topup
- Error "Invalid plan" saat submit topup

### **Solution:**
Pisahkan form Top Up dan Subscription dengan validasi yang berbeda.

---

## 📝 Changes Made

### 1. **Frontend: `frontend/components/Payment.js`**

**Before:**
```javascript
<PaymentForm
  mode="plan"           // ❌ Hardcoded to plan mode only
  plans={plans}
  ...
/>
```

**After:**
```javascript
{/* Top Up Form */}
<div>
  <h2><i className="fas fa-wallet" /> Top Up Saldo</h2>
  <PaymentForm
    mode="topup"        // ✅ Top up mode - no plan required
    plans={[]}
    defaultAmount={50000}
    ...
  />
</div>

{/* Subscription Form */}
<div>
  <h2><i className="fas fa-crown" /> Beli Paket Subscription</h2>
  <PaymentForm
    mode="plan"         // ✅ Subscription mode - plan required
    plans={plans}
    defaultAmount={50000}
    ...
  />
</div>
```

---

### 2. **Backend: `backend/routes/billing.js`**

**Enhanced Validation Logic:**

```javascript
// Determine if this is a topup or subscription
const isTopup = plan === 'topup' || !plan;

if (!isTopup) {
  // Subscription: Validate plan exists
  planInfo = PLANS[plan] || getPlanFromDatabase(plan);
  
  if (!planInfo) {
    return error('Invalid plan');
  }
  
  // Validate amount matches plan price
  if (amount < planInfo.price * 0.9) {
    return error('Invalid amount');
  }
} else {
  // Topup: Only validate minimum amount
  if (amount < 10000) {
    return error('Minimum topup is Rp 10,000');
  }
  
  planInfo = {
    price: amount,
    duration: 0,
    label: 'Top Up',
  };
}
```

**Payment Record:**
```javascript
const paymentData = {
  user_id: uid,
  amount: parseInt(amount),
  plan: isTopup ? 'topup' : plan,      // ✅ Explicit plan field
  plan_label: planInfo.label,
  duration_days: planInfo.duration || 0,
  is_topup: isTopup,                    // ✅ Flag for easy identification
  ...
};
```

---

## 🔄 Payment Flow

### **Top Up Flow:**
```
User selects "Top Up"
    ↓
Enter amount (min Rp 10,000)
    ↓
Upload proof of transfer
    ↓
Submit (plan='topup' or no plan)
    ↓
Backend validates:
  - isTopup = true
  - amount >= 10000
  - proof exists
    ↓
Create payment record with plan='topup'
    ↓
Admin approves
    ↓
Credit added to user balance ✅
```

### **Subscription Flow:**
```
User selects plan (Monthly/Quarterly/Yearly)
    ↓
Amount auto-filled based on plan
    ↓
Upload proof of transfer
    ↓
Submit (plan='monthly'/'quarterly'/'yearly')
    ↓
Backend validates:
  - isTopup = false
  - plan exists in PLANS or database
  - amount matches plan price (±10%)
    ↓
Create payment record with plan='monthly' etc.
    ↓
Admin approves
    ↓
Subscription extended ✅
```

---

## 🧪 Testing

### **Test Top Up:**
```bash
curl 'http://localhost:3000/api/billing/submit' \
  -X POST \
  -H 'Authorization: Bearer <TOKEN>' \
  -F 'amount=50000' \
  -F 'plan=topup' \
  -F 'bank_from=BCA' \
  -F 'transfer_date=2026-03-07' \
  -F 'proof=@receipt.jpg'
```

**Expected:**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "...",
    "plan": "topup",
    "plan_label": "Top Up",
    "duration_days": 0,
    "is_topup": true,
    ...
  }
}
```

### **Test Subscription:**
```bash
curl 'http://localhost:3000/api/billing/submit' \
  -X POST \
  -H 'Authorization: Bearer <TOKEN>' \
  -F 'amount=50000' \
  -F 'plan=monthly' \
  -F 'bank_from=BCA' \
  -F 'transfer_date=2026-03-07' \
  -F 'proof=@receipt.jpg'
```

**Expected:**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "...",
    "plan": "monthly",
    "plan_label": "Monthly",
    "duration_days": 30,
    "is_topup": false,
    ...
  }
}
```

---

## 📊 Database Schema

### **Payment Document (Top Up):**
```javascript
{
  user_id: "user123",
  amount: 100000,
  plan: "topup",
  plan_label: "Top Up",
  duration_days: 0,
  is_topup: true,
  bank_from: "BCA",
  status: "pending",
  ...
}
```

### **Payment Document (Subscription):**
```javascript
{
  user_id: "user123",
  amount: 50000,
  plan: "monthly",
  plan_label: "Monthly",
  duration_days: 30,
  is_topup: false,
  bank_from: "BCA",
  status: "pending",
  ...
}
```

---

## ✅ Validation Rules

| Field | Top Up | Subscription |
|-------|--------|--------------|
| `plan` | Optional (`'topup'` or null) | Required (`'monthly'/'quarterly'/'yearly'`) |
| `amount` | Min Rp 10,000 | Must match plan price (±10%) |
| `duration_days` | 0 | 30/90/365 days |
| `is_topup` | `true` | `false` |
| Proof | Required | Required |
| Transfer date | Required | Required |

---

## 🎯 Benefits

1. **Clear UX**: User knows exactly which form to use
2. **Flexible**: Top up doesn't require plan selection
3. **Accurate**: Backend correctly identifies payment type
4. **Easy Admin**: Admin can see `is_topup` flag for quick processing
5. **No Errors**: No more "Invalid plan" for topup payments

---

## 🔧 Related Files

- `frontend/components/Payment.js` - Payment page with separated forms
- `frontend/components/PaymentForm.js` - Reusable payment form component
- `backend/routes/billing.js` - Payment submission endpoint
- `backend/routes/admin-billing.js` - Admin payment approval

---

**Status:** ✅ Complete  
**Date:** 2026-03-07  
**Impact:** Users can now separately submit Top Up or Subscription payments
