# 🔧 Billing State Management Fix

## 📅 March 6, 2026

---

## 🐛 Problem

Billing enabled state di-manage di **local component state**, bukan di global store.

**Impact:**
- ❌ State tidak persistent across pages
- ❌ Setiap page component fetch ulang
- ❌ Tidak ada single source of truth
- ❌ State bisa inconsistent

---

## ✅ Solution

Added **`useBillingStore`** to global store.

### Before (❌)
```javascript
// Payment.js
const [billingEnabled, setBillingEnabled] = useState(false);
const [plans, setPlans] = useState([]);
const [bankAccounts, setBankAccounts] = useState([]);

// PaymentForm.js (duplicate!)
const [billingEnabled, setBillingEnabled] = useState(false);
const [plans, setPlans] = useState([]);
```

### After (✅)
```javascript
// store/index.js
export const useBillingStore = create((set) => ({
  billingEnabled: false,
  currency: 'IDR',
  plans: [],
  bankAccounts: [],
  loading: true,

  setBillingData: (data) => set({
    billingEnabled: data.billing_enabled || false,
    currency: data.currency || 'IDR',
    plans: data.plans || [],
    bankAccounts: data.bank_accounts || [],
    loading: false,
  }),
}));

// Payment.js
const { billingEnabled, plans, bankAccounts } = useBillingStore();
```

---

## 📝 Changes Made

### 1. **Updated `frontend/store/index.js`**

Added new store:
```javascript
export const useBillingStore = create((set) => ({
  billingEnabled: false,
  currency: 'IDR',
  plans: [],
  bankAccounts: [],
  loading: true,

  setBillingData: (data) => set({
    billingEnabled: data.billing_enabled || false,
    currency: data.currency || 'IDR',
    plans: data.plans || [],
    bankAccounts: data.bank_accounts || [],
    loading: false,
  }),
  setBillingEnabled: (enabled) => set({ billingEnabled: enabled }),
  resetBilling: () => set({
    billingEnabled: false,
    currency: 'IDR',
    plans: [],
    bankAccounts: [],
    loading: true,
  }),
}));
```

### 2. **Updated `frontend/components/Payment.js`**

```javascript
// Before
const [billingEnabled, setBillingEnabled] = useState(false);
const [plans, setPlans] = useState([]);
const [bankAccounts, setBankAccounts] = useState([]);

// After
const { billingEnabled, plans, bankAccounts, setBillingData } = useBillingStore();

// Fetch data
const fetchData = async () => {
  const plansData = await apiFetch('/billing/plans');
  
  // Update global store
  setBillingData({
    billing_enabled: plansData.billing_enabled,
    currency: plansData.currency,
    plans: plansData.plans,
    bank_accounts: plansData.bank_accounts,
  });
};
```

---

## 🎯 Benefits

### 1. **Single Source of Truth**
```javascript
// Any component can access billing state
const { billingEnabled, plans } = useBillingStore();
```

### 2. **Persistent Across Pages**
```javascript
// Navigate from Payment to Dashboard
// Billing state still available!
```

### 3. **Auto-sync**
```javascript
// Update in one place, reflects everywhere
setBillingData({ billing_enabled: true });
// All components using useBillingStore() will re-render
```

### 4. **Type Safety** (if using TypeScript)
```javascript
interface BillingState {
  billingEnabled: boolean;
  currency: string;
  plans: Plan[];
  bankAccounts: Bank[];
}
```

---

## 🧪 Testing

### Check Billing State in Browser Console

```javascript
// 1. Import store
import { useBillingStore } from './store';

// 2. Check current state
const state = useBillingStore.getState();
console.log('Billing State:', state);

// Expected output:
{
  billingEnabled: true,  // ← Should be true after enable
  currency: 'IDR',
  plans: [
    { id: 'monthly', price: 50000, duration: 30, label: 'Monthly' },
    { id: 'quarterly', price: 135000, duration: 90, label: 'Quarterly' },
    { id: 'yearly', price: 480000, duration: 365, label: 'Yearly' }
  ],
  bankAccounts: [
    { id: 'xxx', bank: 'BCA', account_number: '1234567890', ... }
  ],
  loading: false
}
```

### Test in Component

```javascript
// Any component can now access billing state
function MyComponent() {
  const { billingEnabled, plans, bankAccounts } = useBillingStore();
  
  return (
    <div>
      {billingEnabled ? (
        <div>Billing is ENABLED ✅</div>
      ) : (
        <div>Billing is DISABLED ❌</div>
      )}
      
      <div>Plans: {plans.length}</div>
      <div>Banks: {bankAccounts.length}</div>
    </div>
  );
}
```

---

## 📊 State Flow

```
┌─────────────────────────────────────┐
│  Backend API                        │
│  /billing/plans                     │
│  Returns: {                         │
│    billing_enabled: true,           │
│    plans: [...],                    │
│    bank_accounts: [...]             │
│  }                                  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  useBillingStore.setBillingData()   │
│  Updates global state               │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Global Store                       │
│  billingEnabled: true ✅            │
│  plans: [...]                       │
│  bankAccounts: [...]                │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  All Components                     │
│  - Payment.js                       │
│  - Dashboard.js (if needed)         │
│  - Wallet.js (if needed)            │
│  Auto re-render with new state      │
└─────────────────────────────────────┘
```

---

## 🔍 Debugging

### Check Store State

```javascript
// Browser console
import { useBillingStore } from './store';

// Get current state
console.log(useBillingStore.getState());

// Subscribe to changes
useBillingStore.subscribe((state) => {
  console.log('Billing state changed:', state);
});
```

### Force Update Store

```javascript
// If state is stale, force refresh
import { useBillingStore } from './store';

const { setBillingData } = useBillingStore.getState();

// Fetch fresh data
const data = await fetch('/api/billing/plans').then(r => r.json());

// Update store
setBillingData(data);
```

---

## ✅ Verification Checklist

- [ ] `useBillingStore` added to store/index.js
- [ ] Payment.js updated to use store
- [ ] fetchData() calls setBillingData()
- [ ] Components use `billingEnabled` from store
- [ ] State persistent across page navigation
- [ ] No duplicate state in components

---

## 🚀 Next Steps

### 1. Update Other Components

Components that should use billing store:
- [ ] Dashboard.js (show payment CTA if billing enabled)
- [ ] Wallet.js (show top-up options)
- [ ] Layout.js (show payment badge)

### 2. Add Auto-refresh

```javascript
// Refresh billing data every 5 minutes
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await apiFetch('/billing/plans');
    setBillingData(data);
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

### 3. Add Error Handling

```javascript
try {
  const data = await apiFetch('/billing/plans');
  setBillingData(data);
} catch (error) {
  console.error('Failed to load billing data:', error);
  setBillingData({ billing_enabled: false });
}
```

---

## 📝 Migration Guide

### Old Pattern (Don't Use)
```javascript
// ❌ Local state
const [billingEnabled, setBillingEnabled] = useState(false);
```

### New Pattern (Use This)
```javascript
// ✅ Global store
const { billingEnabled, setBillingData } = useBillingStore();
```

---

**Status:** ✅ COMPLETE  
**Store:** Added  
**Payment.js:** Updated  
**State Management:** Centralized  
**Ready for Testing:** Yes

**Last Updated:** March 6, 2026
