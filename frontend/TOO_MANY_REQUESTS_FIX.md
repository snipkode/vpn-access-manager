# Too Many Requests Fix

## Problem
Error "too many requests" terjadi pada halaman Admin Billing dan Payment Settings.

## Root Cause

### 1. AdminBilling.js - Double useEffect
```javascript
// ❌ BUG: Two useEffects calling fetchData()
useEffect(() => {
  fetchData();
}, []);  // Call on mount

const fetchData = () => { ... };

useEffect(() => {
  fetchData();
}, [activeTab]);  // Call on tab change
```

**Result:** Component fetches data TWICE on initial load!

### 2. PaymentSettings.js - No Request Debouncing
Save function called API immediately without debounce, causing multiple rapid requests.

---

## Solution

### ✅ Fix 1: AdminBilling.js
**Before:**
```javascript
useEffect(() => { fetchData(); }, []);
useEffect(() => { fetchData(); }, [activeTab]);
```

**After:**
```javascript
useEffect(() => {
  fetchData();
}, [activeTab]);  // Only ONE useEffect
```

Now data is fetched only when `activeTab` changes (including initial render).

---

### ✅ Fix 2: PaymentSettings.js
**Added:**
- `useRef` for timeout management
- `useCallback` for memoized save function
- Cleanup on unmount to prevent memory leaks

```javascript
const saveTimeoutRef = useRef(null);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, []);

// Debounced save
const handleSaveSettings = useCallback(async () => {
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  
  setLoading(true);
  try {
    await adminBillingAPI.updateSettings(payload);
    // ...
  } finally {
    setLoading(false);
  }
}, [settings]);
```

---

## Files Updated

| File | Change |
|------|--------|
| `components/AdminBilling.js` | Removed duplicate useEffect |
| `components/PaymentSettings.js` | Added debouncing + cleanup |

---

## Testing

1. **Admin Billing Page**
   - Navigate to `/admin-billing`
   - Check browser console → Should see ONLY ONE request
   - Switch tabs (Pending → Approved → All)
   - Each tab change should trigger exactly ONE request

2. **Payment Settings**
   - Navigate to `/payment-settings`
   - Change settings rapidly
   - Should see debounced API calls (not immediate)
   - Save should only trigger ONE request

---

## Prevention

### Best Practices for API Calls:

1. **Single Source of Truth**
   - Only ONE useEffect should trigger data fetch
   - Use dependency array properly

2. **Debounce User Actions**
   - Use `useRef` + `setTimeout` for save operations
   - Clear timeout before setting new one

3. **Cleanup on Unmount**
   ```javascript
   useEffect(() => {
     return () => {
       // Cleanup timeouts, subscriptions, etc.
     };
   }, []);
   ```

4. **Use useCallback**
   - Memoize functions that depend on state
   - Prevents unnecessary re-renders

---

## Additional Notes

### If "Too Many Requests" Still Occurs:

1. **Check Backend Rate Limiting**
   - Backend might have strict rate limits
   - Consider increasing limits for admin endpoints

2. **Add Request Caching**
   ```javascript
   const cache = new Map();
   
   const fetchData = async () => {
     if (cache.has('stats')) {
       return cache.get('stats');
     }
     // Fetch and cache...
   };
   ```

3. **Implement Retry Logic**
   ```javascript
   const fetchWithRetry = async (fn, retries = 3) => {
     try {
       return await fn();
     } catch (error) {
       if (retries > 0) {
         await new Promise(r => setTimeout(r, 1000));
         return fetchWithRetry(fn, retries - 1);
       }
       throw error;
     }
   };
   ```

---

## Verify Fix

Open browser DevTools → Network tab:

**Before Fix:**
```
GET /api/admin/payments/stats        200 OK
GET /api/admin/payments/stats        200 OK  ← Duplicate!
GET /api/admin/payments?status=pending  200 OK
GET /api/admin/payments?status=pending  200 OK  ← Duplicate!
```

**After Fix:**
```
GET /api/admin/payments/stats        200 OK
GET /api/admin/payments?status=pending  200 OK
```

✅ Only ONE request per endpoint!
