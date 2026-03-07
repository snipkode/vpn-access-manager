# Billing Plan Page - Fixed Price Implementation

## 📋 Overview

Halaman Payment user telah diubah menjadi **Billing Plan Page** dengan **fixed price** dari tier yang tersedia. User tidak bisa lagi input amount sembarangan.

---

## 🔄 Changes

### **Before (❌ CUSTOM AMOUNT):**

```javascript
// User bisa input amount sendiri
const [amount, setAmount] = useState(50000);

<input
  type="number"
  value={amount}
  onChange={(e) => setAmount(parseInt(e.target.value))}
  min="10000"
/>

// Validation
if (amount < plan.price * 0.9) {
  throw new Error(`Amount must be at least ${formatCurrency(plan.price)}`);
}
```

**Problems:**
- ❌ User bisa input amount kurang dari harga
- ❌ Validation ribet (90% check)
- ❌ Confusing untuk user
- ❌ Admin susah track payments

---

### **After (✅ FIXED PRICE):**

```javascript
// Amount dari plan (fixed)
const [selectedPlan, setSelectedPlan] = useState(null);

// Plan selection
{plans.map((plan) => (
  <div onClick={() => handlePlanSelect(plan)}>
    {plan.label} - {formatCurrency(plan.price)}
  </div>
))}

// Fixed price display (read-only)
<div className="w-full px-4 py-3 bg-gray-50 border">
  {formatCurrency(selectedPlan.price)}
</div>

// Submit dengan fixed amount
formData.append('amount', selectedPlan.price.toString());
```

**Benefits:**
- ✅ Price always matches plan
- ✅ No validation needed
- ✅ Clear for users
- ✅ Easy for admin tracking

---

## 🎯 UI Changes

### **Tab Names:**

| Before | After |
|--------|-------|
| Submit Payment | Billing Plans |
| History | Payment History |

---

### **Plan Selection:**

**Before:**
```
┌─────────────────┐
│ Select Plan     │
├─────────────────┤
│ ○ Monthly       │
│   Rp 50,000     │
│ ○ Quarterly     │
│   Rp 135,000    │
│ ○ Yearly        │
│   Rp 480,000    │
└─────────────────┘

[Amount Input]
Rp ___________
```

**After:**
```
┌─────────────────────────────────────┐
│  Available Plans (Fixed Price)      │
├─────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌─────┐│
│ │ Monthly   │ │ Quarterly │ │Year ││
│ │ Rp 50,000 │ │ Rp 135,000│ │... ││
│ │ 30 days   │ │ 90 days   │ │     ││
│ │ ✓ Selected│ │           │ │     ││
│ └───────────┘ └───────────┘ └─────┘│
└─────────────────────────────────────┘

ℹ️ Selected Plan
Monthly - Rp 50,000 (30 days)

Plan Price (Fixed)
Rp 50,000
(Read-only)
```

---

## 📝 Implementation Details

### **1. Removed Hardcoded PLANS:**

**Before:**
```javascript
const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly' },
  yearly: { price: 480000, duration: 365, label: 'Yearly' },
};
```

**After:**
```javascript
// Plans from API
const [plans, setPlans] = useState([]);

// Loaded from backend
billingAPI.getSettings().then(data => {
  setPlans(data.plans || []);
});
```

---

### **2. Plan Selection:**

```javascript
const handlePlanSelect = (plan) => {
  setSelectedPlan(plan);
  // Auto-fill transfer date with today
  const today = new Date().toISOString().split('T')[0];
  setTransferDate(today);
};
```

**Features:**
- ✅ Select plan object (not just ID)
- ✅ Auto-set transfer date to today
- ✅ Show selected plan summary

---

### **3. Fixed Price Display:**

```javascript
{selectedPlan && (
  <div>
    <label>Plan Price (Fixed)</label>
    <div className="read-only-input">
      {formatCurrency(selectedPlan.price)}
    </div>
    <p className="hint">
      Price is fixed according to selected plan - cannot be changed
    </p>
  </div>
)}
```

---

### **4. Submit with Fixed Amount:**

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate plan selected
  if (!selectedPlan) {
    throw new Error('Please select a subscription plan');
  }
  
  const formData = new FormData();
  formData.append('amount', selectedPlan.price.toString());  // FIXED!
  formData.append('plan', selectedPlan.id);
  formData.append('plan_label', selectedPlan.label);
  formData.append('duration_days', selectedPlan.duration.toString());
  // ... other fields
};
```

---

## 🎨 UI States

### **State 1: No Plan Selected**

```
┌─────────────────────────────────────┐
│  👆 Select a Plan First             │
│                                     │
│  Please choose a subscription plan  │
│  from the options above to continue │
└─────────────────────────────────────┘
```

### **State 2: Plan Selected**

```
┌─────────────────────────────────────┐
│  ℹ️ Selected Plan                   │
│  Monthly - Rp 50,000 (30 days)      │
├─────────────────────────────────────┤
│  Plan Price (Fixed)                 │
│  ┌─────────────────────────────┐   │
│  │ Rp 50,000                   │   │
│  └─────────────────────────────┘   │
│  (Read-only)                        │
├─────────────────────────────────────┤
│  Bank / E-Wallet Used               │
│  [________________]                 │
│                                     │
│  Transfer Date                      │
│  [2024-01-15]                       │
│                                     │
│  Proof of Transfer                  │
│  [Choose File]                      │
│                                     │
│  [Submit Payment]                   │
└─────────────────────────────────────┘
```

---

## 📊 Data Flow

```
User selects plan
       ↓
selectedPlan = {
  id: 'monthly',
  price: 50000,
  duration: 30,
  label: 'Monthly'
}
       ↓
Price display updates (read-only)
       ↓
User fills form
       ↓
Submit → amount = selectedPlan.price (fixed)
       ↓
Backend receives exact plan price
```

---

## ✅ Validation

### **Before:**
```javascript
// Complex validation
if (amount < plan.price * 0.9) {
  throw new Error(`Amount must be at least...`);
}
```

### **After:**
```javascript
// Simple validation
if (!selectedPlan) {
  throw new Error('Please select a subscription plan');
}
// Amount is always correct (from plan)
```

---

## 🧪 Testing

### **Test 1: Select Plan**

```
1. Open Billing Plans tab
2. Click "Monthly" plan card
3. Expected: Plan highlighted, summary shown
4. Expected: Price display shows Rp 50,000
```

### **Test 2: Submit Payment**

```
1. Select Monthly plan
2. Fill bank: BCA
3. Upload proof
4. Submit
5. Expected: amount = 50000 (fixed)
6. Expected: plan = 'monthly'
7. Expected: plan_label = 'Monthly'
```

### **Test 3: Switch Plans**

```
1. Select Monthly (Rp 50,000)
2. Change to Yearly (Rp 480,000)
3. Expected: Price updates to Rp 480,000
4. Expected: amount in form = 480000
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `frontend/components/Payment.js` | ✅ Removed hardcoded PLANS<br>✅ Added plan selection UI<br>✅ Fixed price display<br>✅ Updated handleSubmit |

---

## 🎯 Benefits Summary

### **For Users:**
- ✅ Clear pricing (no confusion)
- ✅ Easy plan comparison
- ✅ No validation errors
- ✅ Faster checkout

### **For Admins:**
- ✅ Consistent payment amounts
- ✅ Easy tracking by plan
- ✅ No manual price checking
- ✅ Better reporting

### **For System:**
- ✅ No amount validation
- ✅ Accurate plan data
- ✅ Better data integrity
- ✅ Cleaner code

---

## 🚀 Migration Notes

### **Breaking Changes:**
- ❌ No custom amount input
- ✅ Fixed price from plan
- ✅ Plan ID required
- ✅ Plan label included

### **Backend Compatibility:**
- ✅ Already supports plan-based payments
- ✅ Validates amount vs plan price
- ✅ Stores plan_label & duration_days

---

## 📚 Related Documentation

- [Payment Wallet Integration](./PAYMENT_WALLET_INTEGRATION.md)
- [Top Up Feature](./TOP_UP_FEATURE.md)
- [Payment Credit Flow](./PAYMENT_CREDIT_FLOW.md)

---

**Status:** ✅ COMPLETE - Billing Plan page with fixed price implemented  
**Last Updated:** 2026-03-07
