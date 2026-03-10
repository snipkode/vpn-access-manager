# 🔓 Payment Config Endpoint - User Access Fix

## 📋 Problem

**Issue:** User role tidak bisa akses info apakah payment system enabled atau tidak.

**Impact:** 
- User tidak tahu apakah billing sedang aktif
- User tidak bisa submit payment karena tidak ada info bank
- Frontend tidak bisa show/hide payment button

---

## ✅ Solution

### **New Public Endpoint:** `/api/payment-settings/config`

Endpoint baru yang **public** (no auth required) untuk mengecek status billing system.

#### **Request:**
```http
GET /api/payment-settings/config
```

#### **Response:**
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

#### **Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `billing_enabled` | boolean | Apakah billing system aktif |
| `currency` | string | Currency yang digunakan (IDR) |
| `has_bank_accounts` | boolean | Apakah ada bank yang terkonfigurasi |
| `bank_accounts_count` | integer | Jumlah bank aktif |
| `can_submit_payment` | boolean | **User bisa submit payment atau tidak** |
| `message` | string\|null | Pesan info jika ada masalah |

---

## 📊 Response Scenarios

### **Scenario 1: Billing Enabled ✅**
```json
{
  "billing_enabled": true,
  "currency": "IDR",
  "has_bank_accounts": true,
  "bank_accounts_count": 2,
  "can_submit_payment": true,
  "message": null
}
```

### **Scenario 2: Billing Disabled ❌**
```json
{
  "billing_enabled": false,
  "currency": "IDR",
  "has_bank_accounts": false,
  "bank_accounts_count": 0,
  "can_submit_payment": false,
  "message": "Billing is currently disabled. Please contact admin for payment information."
}
```

### **Scenario 3: No Bank Accounts Configured ⚠️**
```json
{
  "billing_enabled": true,
  "currency": "IDR",
  "has_bank_accounts": false,
  "bank_accounts_count": 0,
  "can_submit_payment": false,
  "message": "No bank accounts configured. Please contact admin."
}
```

---

## 🔍 Comparison: Available Endpoints

| Endpoint | Auth Required | User Role | Admin Role | Data Returned |
|----------|---------------|-----------|------------|---------------|
| `/api/payment-settings/config` | ❌ No | ✅ Full | ✅ Full | Basic config + status |
| `/api/payment-settings/status` | ❌ No | ✅ Basic | ✅ Basic | Minimal status |
| `/api/payment-settings/banks` | ❌ No | ✅ Full | ✅ Full | Bank accounts list |
| `/api/payment-settings/settings` | ✅ Yes | ❌ Denied | ✅ Full | Full settings |
| `/api/billing/plans` | ❌ No | ✅ Full | ✅ Full | Plans + banks |

---

## 🎯 Usage Examples

### **Frontend: Check Before Show Payment Button**

```javascript
// ✅ NEW: Check if payment is available
async function checkPaymentAvailability() {
  const response = await fetch('/api/payment-settings/config');
  const config = await response.json();
  
  if (config.can_submit_payment) {
    showPaymentButton();
  } else {
    showPaymentDisabledMessage(config.message);
  }
}

// ✅ Get bank accounts
async function loadBankAccounts() {
  const response = await fetch('/api/payment-settings/banks');
  const { bank_accounts } = await response.json();
  
  renderBankList(bank_accounts);
}

// ✅ Get pricing plans
async function loadPlans() {
  const response = await fetch('/api/billing/plans');
  const { billing_enabled, plans, bank_accounts } = await response.json();
  
  if (!billing_enabled) {
    showBillingDisabledMessage();
    return;
  }
  
  renderPlans(plans);
}
```

### **Frontend: Complete Payment Page Flow**

```javascript
async function initPaymentPage() {
  try {
    // Step 1: Check config (no auth needed)
    const configResponse = await fetch('/api/payment-settings/config');
    const config = await config.json();
    
    if (!config.can_submit_payment) {
      showDisabledState(config.message);
      return;
    }
    
    // Step 2: Load plans and banks
    const [plansRes, banksRes] = await Promise.all([
      fetch('/api/billing/plans'),
      fetch('/api/payment-settings/banks')
    ]);
    
    const { plans } = await plansRes.json();
    const { bank_accounts } = await banksRes.json();
    
    // Step 3: Render UI
    renderPaymentForm({ plans, bank_accounts });
    
  } catch (error) {
    showError('Failed to load payment information');
  }
}
```

---

## 🔐 Security Considerations

### **What's Public:**
- ✅ Billing enabled/disabled status
- ✅ Currency
- ✅ Bank accounts count
- ✅ Whether payment submission is possible

### **What's Protected (Admin Only):**
- 🔒 Full payment settings
- 🔒 Min/max amounts
- 🔒 Auto-approve settings
- 🔒 Notification email
- 🔒 Bank account sensitive details (if any)

---

## 📝 API Documentation

### **OpenAPI/Swagger**

```yaml
/api/payment-settings/config:
  get:
    summary: Get payment system configuration (Public)
    tags: [Payment Settings]
    description: Check if billing is enabled and payment submission is possible
    responses:
      200:
        description: Payment config retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                billing_enabled:
                  type: boolean
                  description: Whether billing system is enabled
                currency:
                  type: string
                  example: IDR
                has_bank_accounts:
                  type: boolean
                  description: Whether there are active bank accounts
                bank_accounts_count:
                  type: integer
                  description: Number of active bank accounts
                can_submit_payment:
                  type: boolean
                  description: Whether users can submit payment proofs
                message:
                  type: string
                  nullable: true
                  description: Info message if billing is disabled
```

---

## 🧪 Testing

### **Test with curl:**

```bash
# Test public config endpoint (no auth)
curl http://localhost:3000/api/payment-settings/config

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/payment-settings/config

# Test admin-only settings endpoint
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3000/api/payment-settings/settings
```

### **Expected Results:**

```bash
# ✅ Public config - Always accessible
GET /api/payment-settings/config
→ 200 OK (with or without token)

# ✅ Banks list - Accessible when billing enabled
GET /api/payment-settings/banks
→ 200 OK (if billing_enabled=true)
→ 503 Service Unavailable (if billing_enabled=false)

# ❌ Full settings - Admin only
GET /api/payment-settings/settings
→ 200 OK (with admin token)
→ 403 Forbidden (with user token)
→ 401 Unauthorized (no token)
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `routes/payment-settings.js` | Added `/config` endpoint with public access |
| `config/swagger-routes.js` | Added API documentation |

---

## 🚀 Migration Guide

### **For Frontend Developers:**

**OLD Approach:**
```javascript
// ❌ Had to call billing/plans to check status
const response = await fetch('/api/billing/plans');
const { billing_enabled } = await response.json();
```

**NEW Approach:**
```javascript
// ✅ Lightweight config check first
const config = await fetch('/api/payment-settings/config').then(r => r.json());

if (config.can_submit_payment) {
  // Then load full data
  const { plans, bank_accounts } = await fetch('/api/billing/plans').then(r => r.json());
}
```

### **Benefits:**
1. ✅ **Faster** - Lightweight endpoint, no plans data
2. ✅ **Clearer** - Explicit `can_submit_payment` flag
3. ✅ **Better UX** - Show appropriate message if disabled
4. ✅ **No auth needed** - Can check before login

---

## 🎨 UI/UX Recommendations

### **Payment Page States:**

```javascript
// State 1: Billing Enabled
if (config.can_submit_payment) {
  return <PaymentForm plans={plans} banks={bank_accounts} />;
}

// State 2: Billing Disabled
if (!config.billing_enabled) {
  return (
    <Alert severity="warning">
      ⚠️ Payment system is currently unavailable.
      <br />
      {config.message}
    </Alert>
  );
}

// State 3: No Banks Configured
if (!config.has_bank_accounts) {
  return (
    <Alert severity="error">
      ❌ No payment methods configured.
      <br />
      {config.message}
    </Alert>
  );
}
```

---

## 📚 Related Documentation

- [Billing API Documentation](./SWAGGER.md)
- [Rate Limit Fix](./RATE_LIMIT_FIX.md)
- [Swagger Documentation](./SWAGGER.md)
