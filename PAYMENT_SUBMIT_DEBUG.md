# Payment Submit "Invalid Plan" Error - Debug & Fix

## 🔍 Problem

User mendapat error saat submit payment:
```
❌ API Fetch Error: {"endpoint":"/billing/submit","message":"Invalid plan"}
```

## 📊 Analysis

### Frontend Flow:
1. `Payment.js` component fetches plans from `/api/payment-settings/config`
2. Plans passed to `PaymentForm` component with `mode="plan"`
3. `PaymentForm` initializes `selectedPlan` state:
   ```javascript
   const [selectedPlan, setSelectedPlan] = useState(
     mode === 'plan' && plans[0]?.id ? plans[0].id : null
   );
   ```
4. On submit, plan only sent if `selectedPlan` is truthy:
   ```javascript
   if (mode === 'plan' && selectedPlan) {
     formData.append('plan', selectedPlan);
   }
   ```

### Backend Validation:
```javascript
// Validate plan
if (!plan || !PLANS[plan]) {
  return res.status(400).json({
    error: 'Invalid plan',
    available_plans: Object.keys(PLANS)
  });
}
```

## 🐛 Possible Causes

1. **`selectedPlan` is null** - Plans array empty or not loaded yet
2. **Case mismatch** - Frontend sends "Monthly", backend expects "monthly"
3. **Whitespace** - Frontend sends "monthly ", backend expects "monthly"
4. **Plans not synced** - Frontend plans from API don't match backend hardcoded PLANS

## ✅ Fixes Applied

### Backend: Enhanced Validation Logging

Added debug logging to see what's being sent:

```javascript
console.log('📥 [BILLING SUBMIT] Received:', { plan, amount, bank_from, transfer_date });

// Support both hardcoded PLANS and dynamic plans from database
let planInfo = PLANS[plan];

if (!planInfo) {
  // Try to get plans from payment_settings
  const settingsDoc = await db.collection('payment_settings').doc('config').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  const plans = settings.plans || [];
  const foundPlan = plans.find(p => p.id === plan);
  
  if (foundPlan) {
    planInfo = {
      price: foundPlan.price || 0,
      duration: foundPlan.duration || 0,
      label: foundPlan.label || plan,
    };
  }
}

if (!planInfo) {
  return res.status(400).json({
    error: 'Invalid plan',
    message: `Plan "${plan}" not found`,
    available_plans: Object.keys(PLANS)
  });
}
```

## 🧪 Debug Steps

### 1. Check what frontend sends

Open browser console and check network tab for `/billing/submit` request.
Look at FormData:

```
plan: "monthly"  ✅ Should be lowercase
amount: "50000"
bank_from: "BCA"
transfer_date: "2026-03-07"
proof: [File]
```

### 2. Check backend logs

```bash
cd /home/vpn-access-manager/backend
tail -f logs/app.log | grep "BILLING SUBMIT"
```

Expected output:
```
📥 [BILLING SUBMIT] Received: { plan: 'monthly', amount: '50000', ... }
✅ [BILLING SUBMIT] Plan validated: { price: 50000, duration: 30, label: 'Monthly' }
```

### 3. Run test script

```bash
node scripts/test-payment-submit.js
```

## 🔧 Quick Fix Options

### Option 1: Ensure plans loaded before submit

In `PaymentForm.js`, add validation:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate plan selected
  if (mode === 'plan' && !selectedPlan) {
    showNotification('Please select a plan', 'error');
    return;
  }
  
  // ... rest of submit logic
};
```

### Option 2: Auto-select first plan if none selected

In `PaymentForm.js` useState:

```javascript
const [selectedPlan, setSelectedPlan] = useState(
  mode === 'plan' && plans.length > 0 ? plans[0].id : null
);
```

### Option 3: Make backend more lenient

Already done! Backend now tries to find plan in database if not in hardcoded PLANS.

## 📋 Test Checklist

- [ ] Plans array is not empty in Payment.js
- [ ] First plan has valid `id` field
- [ ] `selectedPlan` is initialized correctly
- [ ] Browser FormData sends correct plan value
- [ ] Backend receives correct plan value
- [ ] Backend validation passes

## 🎯 Next Steps

1. **Check browser console** - See what FormData is sent
2. **Check backend logs** - See what backend receives
3. **Compare values** - Check for case/whitespace mismatch
4. **Test with hardcoded plan** - Try submitting with explicit "monthly"

## 📞 Support

If issue persists, provide:
1. Browser network tab screenshot of `/billing/submit` request
2. Backend logs around the error time
3. Console logs from frontend
