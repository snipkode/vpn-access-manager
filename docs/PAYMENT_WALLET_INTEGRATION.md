# Payment & Wallet Integration Guide

## 📋 Overview

Dokumentasi ini menjelaskan integrasi antara **Frontend** (React/Next.js) dan **Backend** (Node.js/Express) untuk halaman **Payment** dan **Wallet** dengan role **User**.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                 │
│  - Payment.js        → Submit payment & history             │
│  - Wallet.js         → Credit balance & transactions        │
│                                                              │
│  Store (Zustand):                                            │
│  - useBillingStore   → Global billing state                 │
│  - useAuthStore      → Authentication & token               │
│                                                              │
│  API Client:                                                 │
│  - lib/api.js        → billingAPI, creditAPI                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST (Bearer Token)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js/Express)                │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                     │
│  - routes/billing.js            → Payment submission        │
│  - routes/credit.js             → Credit balance/transfer   │
│  - routes/payment-settings.js   → Config & bank accounts    │
│                                                              │
│  Database:                                                   │
│  - Firebase Firestore                                        │
│  - Collections: payments, credit_transactions, bank_accounts │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔓 Public Endpoints (No Auth Required)

### 1. **GET /api/payment-settings/config**

Cek apakah payment system aktif dan tersedia.

**Response:**
```json
{
  "billing_enabled": true,
  "currency": "IDR",
  "has_bank_accounts": true,
  "bank_accounts_count": 1,
  "can_submit_payment": true,
  "message": null
}
```

**Test dengan curl:**
```bash
curl http://localhost:3000/api/payment-settings/config
```

---

### 2. **GET /api/billing/plans**

Dapatkan daftar paket subscription dan bank accounts.

**Response:**
```json
{
  "billing_enabled": true,
  "currency": "IDR",
  "plans": [
    {
      "id": "monthly",
      "price": 50000,
      "duration": 30,
      "label": "Monthly",
      "price_formatted": "Rp 50.000"
    },
    {
      "id": "quarterly",
      "price": 135000,
      "duration": 90,
      "label": "Quarterly (10% off)",
      "price_formatted": "Rp 135.000"
    },
    {
      "id": "yearly",
      "price": 480000,
      "duration": 365,
      "label": "Yearly (20% off)",
      "price_formatted": "Rp 480.000"
    }
  ],
  "bank_accounts": [
    {
      "id": "6CkwUCCIJC14793mBejN",
      "bank": "BCA",
      "account_number": "4330427430",
      "account_name": "Alam Santiko Wibowo"
    }
  ]
}
```

**Test dengan curl:**
```bash
curl http://localhost:3000/api/billing/plans
```

---

### 3. **GET /api/payment-settings/banks**

Dapatkan daftar bank aktif (hanya jika billing enabled).

**Response:**
```json
{
  "bank_accounts": [
    {
      "id": "...",
      "bank": "BCA",
      "account_number": "1234567890",
      "account_name": "PT VPN Access",
      "description": "Transfer ke rekening ini",
      "qr_code_url": "https://..."
    }
  ],
  "currency": "IDR"
}
```

---

## 🔐 Protected Endpoints (Requires Auth)

### 1. **POST /api/billing/submit**

Submit payment proof untuk subscription.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
proof: <file>           # Image/PDF, max 5MB
amount: "50000"         # Amount in IDR
plan: "monthly"         # Plan ID
bank_from: "BCA"        # Bank/e-wallet used
transfer_date: "2024-01-15"
notes: "Optional notes"
```

**Response (201):**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "payment_id",
    "user_id": "uid",
    "amount": 50000,
    "plan": "monthly",
    "plan_label": "Monthly",
    "duration_days": 30,
    "bank_from": "BCA",
    "transfer_date": "2024-01-15T00:00:00.000Z",
    "proof_image_url": "/uploads/proofs/proof-123456.jpg",
    "status": "pending",
    "notes": "",
    "created_at": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 - Invalid plan
{
  "error": "Invalid plan",
  "available_plans": ["monthly", "quarterly", "yearly"]
}

// 400 - Invalid amount
{
  "error": "Invalid amount",
  "expected": 50000,
  "submitted": 30000
}

// 400 - Pending payment exists
{
  "error": "You have a pending payment",
  "message": "Please wait for admin approval before submitting another payment"
}

// 503 - Billing disabled
{
  "error": "Billing disabled",
  "message": "Payment functionality is currently unavailable. Please contact admin."
}
```

---

### 2. **GET /api/billing/history**

Dapatkan riwayat payment user.

**Query Parameters:**
- `limit` (default: 20)
- `status` (optional: pending, approved, rejected)

**Response:**
```json
{
  "payments": [
    {
      "id": "payment_id",
      "user_id": "uid",
      "amount": 50000,
      "plan": "monthly",
      "plan_label": "Monthly",
      "duration_days": 30,
      "bank_from": "BCA",
      "transfer_date": "2024-01-15T00:00:00.000Z",
      "status": "pending",
      "admin_note": "",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 3. **GET /api/billing/subscription**

Cek status subscription user.

**Response:**
```json
{
  "subscription": {
    "active": true,
    "plan": "monthly",
    "plan_label": "Monthly",
    "subscription_end": "2024-02-15T00:00:00.000Z",
    "days_remaining": 30,
    "vpn_enabled": true,
    "total_purchases": 1
  }
}
```

---

### 4. **GET /api/credit/balance**

Dapatkan saldo credit user.

**Response:**
```json
{
  "balance": 100000,
  "total_earned": 150000,
  "total_spent": 50000,
  "formatted_balance": "Rp 100.000"
}
```

---

### 5. **GET /api/credit/transactions**

Dapatkan riwayat transaksi credit.

**Query Parameters:**
- `limit` (default: 20)
- `type` (optional: topup, credit, deduction, transfer, auto_renewal)

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx_id",
      "user_id": "uid",
      "type": "topup",
      "amount": 50000,
      "description": "Payment approved",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## 🎯 Frontend Implementation

### **Payment.js Component Flow**

```javascript
// 1. Component mounts
useEffect(() => {
  fetchData();
}, []);

// 2. Fetch data from API
const fetchData = async () => {
  const [settingsData, historyData] = await Promise.all([
    billingAPI.getSettings(),      // GET /api/payment-settings/config
    billingAPI.getPayments({ limit: 10 })  // GET /api/billing/history
  ]);
  
  // 3. Update global store
  setBillingData({
    billing_enabled: settingsData.billing_enabled,
    currency: settingsData.currency,
    plans: settingsData.plans,
    bank_accounts: settingsData.bank_accounts,
  });
  
  // 4. Set local state
  setPaymentHistory(historyData.payments || []);
};

// 5. Submit payment
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Create FormData
  const formData = new FormData();
  formData.append('amount', amount.toString());
  formData.append('plan', selectedPlan);
  formData.append('bank_from', bankFrom);
  formData.append('transfer_date', transferDate);
  formData.append('notes', notes);
  formData.append('proof', proofFile);
  
  // Submit to API
  await billingAPI.submitPayment(formData);  // POST /api/billing/submit
  
  // Refresh history
  fetchData();
};
```

---

### **Wallet.js Component Flow**

```javascript
// 1. Component mounts
useEffect(() => {
  fetchData();
}, []);

// 2. Fetch balance and transactions
const fetchData = async () => {
  const [balanceData, transactionsData] = await Promise.all([
    creditAPI.getBalance(),           // GET /api/credit/balance
    creditAPI.getTransactions({ limit: 10 })  // GET /api/credit/transactions
  ]);
  
  setBalance(balanceData.balance || 0);
  setTransactions(transactionsData.transactions || []);
};
```

---

### **API Client (lib/api.js)**

```javascript
// billingAPI
export const billingAPI = {
  getSettings: async () => {
    return apiFetch('/payment-settings/config');
  },
  
  getPayments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/billing/payments?${queryString}` : '/billing/payments';
    return apiFetch(url);
  },
  
  submitPayment: async (formData) => {
    return apiFetch('/billing/payments', {
      method: 'POST',
      body: formData,  // FormData object
    });
  },
};

// creditAPI
export const creditAPI = {
  getBalance: async () => {
    return apiFetch('/credit/balance');
  },
  
  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/credit/transactions?${queryString}` : '/credit/transactions';
    return apiFetch(url);
  },
};
```

---

### **Global Store (store/index.js)**

```javascript
// useBillingStore
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
```

---

## 🧪 Testing Guide

### **1. Test Public Endpoints**

```bash
# Check payment config
curl http://localhost:3000/api/payment-settings/config

# Check billing plans
curl http://localhost:3000/api/billing/plans

# Check bank accounts
curl http://localhost:3000/api/payment-settings/banks
```

### **2. Test Protected Endpoints (User Role)**

```bash
# Get user token first (from browser console after login)
# copy(useAuthStore.getState().token)

# Check credit balance
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/credit/balance

# Check payment history
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/billing/history

# Check subscription status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/billing/subscription
```

### **3. Test Payment Submission (User Role)**

```bash
# Submit payment proof
curl -X POST http://localhost:3000/api/billing/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "amount=50000" \
  -F "plan=monthly" \
  -F "bank_from=BCA" \
  -F "transfer_date=2024-01-15" \
  -F "notes=Test payment" \
  -F "proof=@/path/to/receipt.jpg"
```

---

## 🔒 Security & Rate Limiting

### **Rate Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/billing/submit | 5 requests | 1 hour |
| GET /api/billing/history | 30 requests | 1 hour |
| GET /api/credit/balance | 30 requests | 1 hour |
| POST /api/credit/transfer | 5 requests | 1 hour |

### **File Upload Validation:**

- Allowed types: JPEG, PNG, PDF
- Max file size: 5MB
- Stored in: `backend/uploads/proofs/`

### **Payment Validation:**

- User cannot submit if there's a pending payment
- Amount must be ≥ 90% of plan price
- Transfer date is required
- Billing must be enabled

---

## 📁 File Structure

```
frontend/
├── components/
│   ├── Payment.js          # Main payment component
│   ├── Wallet.js           # Wallet/credit component
│   └── PaymentForm.js      # ⚠️ DEPRECATED - remove this
├── lib/
│   └── api.js              # API client (billingAPI, creditAPI)
├── store/
│   └── index.js            # Zustand stores (useBillingStore)
└── pages/
    └── index.js            # Main app (routes to Payment/Wallet)

backend/
├── routes/
│   ├── billing.js              # Payment submission endpoints
│   ├── credit.js               # Credit balance/transfer endpoints
│   └── payment-settings.js     # Config & bank accounts
├── middleware/
│   └── rateLimit.js            # Rate limiting middleware
├── services/
│   └── credit.js               # Credit service logic
└── uploads/
    └── proofs/                 # Payment proof files
```

---

## ✅ Integration Checklist

### **Payment Page:**
- [ ] ✅ GET /api/payment-settings/config (public)
- [ ] ✅ GET /api/billing/plans (public)
- [ ] ✅ GET /api/billing/history (auth required)
- [ ] ✅ POST /api/billing/submit (auth required)
- [ ] ✅ useBillingStore for global state
- [ ] ✅ FormData for file upload
- [ ] ✅ File validation (type, size)

### **Wallet Page:**
- [ ] ✅ GET /api/credit/balance (auth required)
- [ ] ✅ GET /api/credit/transactions (auth required)
- [ ] ✅ Transaction history display
- [ ] ✅ Balance formatting (IDR)

---

## 🐛 Troubleshooting

### **Issue: "Billing disabled"**
**Solution:** Admin perlu enable billing via `/api/payment-settings/toggle-billing`

### **Issue: "You have a pending payment"**
**Solution:** Tunggu admin approve payment sebelumnya, atau contact admin

### **Issue: "Invalid amount"**
**Solution:** Amount harus ≥ 90% dari harga plan (untuk toleransi biaya bank)

### **Issue: "Unauthorized"**
**Solution:** Token expired, user perlu login ulang

---

## 📚 Related Documentation

- [Swagger API Docs](./backend/SWAGGER.md)
- [Payment Config Endpoint](./backend/PAYMENT_CONFIG_ENDPOINT.md)
- [Billing Enable Fix](./backend/BILLING_ENABLE_FIX.md)
- [Troubleshooting Billing](./TROUBLESHOOTING_BILLING.md)
