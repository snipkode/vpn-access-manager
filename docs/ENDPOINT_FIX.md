# Endpoint Mismatch Fix - Payment & Wallet Integration

## 🐛 Problem

Frontend memanggil endpoint yang salah:
- ❌ `GET /api/billing/payments` → **404 Not Found**
- ❌ `POST /api/billing/payments` → **404 Not Found**

## ✅ Solution

Backend menggunakan endpoint yang berbeda:
- ✅ `GET /api/billing/history` → Payment history
- ✅ `POST /api/billing/submit` → Submit payment proof

## 📝 Endpoint Mapping

### **Frontend → Backend**

| Frontend Call | Backend Route | File | Status |
|---------------|---------------|------|--------|
| `GET /api/billing/history` | `/billing/history` | `routes/billing.js:300` | ✅ Working |
| `POST /api/billing/submit` | `/billing/submit` | `routes/billing.js:134` | ✅ Working |
| `GET /api/billing/subscription` | `/billing/subscription` | `routes/billing.js:360` | ✅ Working |
| `GET /api/billing/plans` | `/billing/plans` | `routes/billing.js:458` | ✅ Working |
| `GET /api/payment-settings/config` | `/payment-settings/config` | `routes/payment-settings.js:404` | ✅ Working |
| `GET /api/credit/balance` | `/credit/balance` | `routes/credit.js:36` | ✅ Working |
| `GET /api/credit/transactions` | `/credit/transactions` | `routes/credit.js:56` | ✅ Working |

## 🔧 Files Modified

### **frontend/lib/api.js**

**Before:**
```javascript
getPayments: async (params = {}) => {
  const url = queryString ? `/billing/payments?${queryString}` : '/billing/payments';
  return apiFetch(url);
},

submitPayment: async (formData) => {
  return apiFetch('/billing/payments', {
    method: 'POST',
    body: formData,
  });
},
```

**After:**
```javascript
getPayments: async (params = {}) => {
  const url = queryString ? `/billing/history?${queryString}` : '/billing/history';
  return apiFetch(url);
},

submitPayment: async (formData) => {
  return apiFetch('/billing/submit', {
    method: 'POST',
    body: formData,
  });
},
```

## 🧪 Testing

### **Test dengan curl:**

```bash
# Get payment history (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/billing/history

# Submit payment (requires auth token + FormData)
curl -X POST http://localhost:3000/api/billing/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "amount=50000" \
  -F "plan=monthly" \
  -F "bank_from=BCA" \
  -F "transfer_date=2024-01-15" \
  -F "proof=@receipt.jpg"

# Get subscription status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/billing/subscription
```

### **Expected Responses:**

**GET /api/billing/history:**
```json
{
  "payments": []
}
```

**POST /api/billing/submit:**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "payment_id",
    "amount": 50000,
    "plan": "monthly",
    "status": "pending",
    ...
  }
}
```

## 📊 Complete API Reference

### **Public Endpoints (No Auth)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment-settings/config` | Check billing status |
| GET | `/api/payment-settings/banks` | Get bank accounts |
| GET | `/api/billing/plans` | Get subscription plans |

### **User Endpoints (Auth Required)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/history` | Payment history |
| POST | `/api/billing/submit` | Submit payment proof |
| GET | `/api/billing/subscription` | Subscription status |
| GET | `/api/credit/balance` | Credit balance |
| GET | `/api/credit/transactions` | Credit transactions |
| POST | `/api/credit/transfer` | Transfer credit |

### **Admin Endpoints (Auth + Admin Role)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/payments` | All payments |
| POST | `/api/admin/payments/:id/approve` | Approve payment |
| POST | `/api/admin/payments/:id/reject` | Reject payment |
| GET | `/api/admin/billing/dashboard` | Billing dashboard |

## ✅ Verification Checklist

- [x] Fixed `getPayments()` → `/billing/history`
- [x] Fixed `submitPayment()` → `/billing/submit`
- [x] Verified backend routes exist
- [x] Tested with curl
- [x] Updated documentation

## 📚 Related Files

- `frontend/lib/api.js` - API client
- `backend/routes/billing.js` - Billing routes
- `backend/routes/credit.js` - Credit routes
- `backend/routes/payment-settings.js` - Payment config routes

## 🎯 Next Steps

1. ✅ Refresh frontend page
2. ✅ Check Eruda console for errors
3. ✅ Test payment submission flow
4. ✅ Verify payment history display

---

**Status:** ✅ Fixed - Endpoints now match backend routes
