# Payment System & Credit Transaction - Complete Flow

## 📋 Overview

Sistem payment dan credit transaction saling terhubung. Ketika user melakukan payment (baik untuk subscription atau top-up), ada 2 kemungkinan outcome:

1. **Subscription Payment** → Extend subscription end date
2. **Top-Up Payment** → Add credit balance

---

## 🔄 Complete Flow

### **Flow 1: Subscription Payment**

```
User submits payment for subscription (Monthly/Quarterly/Yearly)
         ↓
Payment status: PENDING
         ↓
Admin reviews and approves
         ↓
System:
  - Updates payment status → APPROVED
  - Calculates new subscription_end date
  - Updates user.subscription_end
  - Enables VPN access
  - Sends approval email
         ↓
User subscription extended ✅
```

### **Flow 2: Top-Up Payment**

```
User submits payment for top-up
         ↓
Payment status: PENDING
         ↓
Admin reviews and approves
         ↓
System:
  - Updates payment status → APPROVED
  - Adds payment.amount to user.credit_balance
  - Creates credit_transaction record (type: 'topup')
  - Sends approval email
         ↓
User credit balance increased ✅
```

---

## 📊 Database Changes

### **On Payment Submit:**

**payments collection:**
```javascript
{
  user_id: "user_uid",
  amount: 50000,
  plan: "topup", // or "monthly", "quarterly", "yearly"
  plan_label: "Top Up",
  duration_days: 0, // or 30/90/365 for subscription
  bank_from: "BCA",
  transfer_date: "2024-01-15",
  proof_image_url: "/uploads/proofs/proof-123.jpg",
  status: "pending",
  created_at: "2024-01-15T10:00:00.000Z"
}
```

### **On Payment Approve (Top-Up):**

**users collection (updated):**
```javascript
{
  ...user_data,
  credit_balance: 150000, // Increased by payment amount
  updated_at: "2024-01-15T10:05:00.000Z"
}
```

**credit_transactions collection (new):**
```javascript
{
  user_id: "user_uid",
  type: "topup",
  amount: 50000,
  status: "completed",
  description: "Top-up approved",
  related_payment_id: "payment_id",
  created_at: "2024-01-15T10:05:00.000Z"
}
```

### **On Payment Approve (Subscription):**

**users collection (updated):**
```javascript
{
  ...user_data,
  vpn_enabled: true,
  subscription_end: "2024-02-15T00:00:00.000Z", // Extended
  subscription_plan: "monthly",
  updated_at: "2024-01-15T10:05:00.000Z"
}
```

---

## 🔍 Payment Type Detection

Backend mendeteksi tipe payment berdasarkan:

```javascript
const isTopup = paymentData.plan === 'topup' || 
                !paymentData.duration_days || 
                paymentData.duration_days === 0;

if (isTopup) {
  // Add credit balance
} else {
  // Extend subscription
}
```

---

## 💳 Credit Transaction Types

| Type | Description | Source |
|------|-------------|--------|
| `topup` | Manual top-up via payment | Payment approval |
| `credit` | Credit added (bonus, refund) | Admin manual |
| `deduction` | Credit deducted | Admin manual |
| `transfer` | Transfer to another user | User transfer |
| `auto_renewal` | Auto subscription renewal | Cron job |

---

## 📝 API Endpoints

### **User Side:**

```javascript
// Submit payment (subscription or top-up)
POST /api/billing/submit
Body: FormData {
  amount: "50000",
  plan: "topup", // or "monthly", "quarterly", "yearly"
  bank_from: "BCA",
  transfer_date: "2024-01-15",
  proof: <file>
}

// Get payment history
GET /api/billing/payments

// Get credit balance
GET /api/credit/balance

// Get credit transactions
GET /api/credit/transactions
```

### **Admin Side:**

```javascript
// Approve payment
POST /api/admin/billing/payments/:id/approve
Body: { admin_note: "Verified" }

// Reject payment
POST /api/admin/billing/payments/:id/reject
Body: { reason: "Invalid proof" }

// Get all payments
GET /api/admin/billing/payments?status=pending
```

---

## 🎯 User Interface Flow

### **Wallet Component:**

```
┌─────────────────────────────────────┐
│  Wallet & Top Up                    │
├─────────────────────────────────────┤
│  [Top Up] [History] [Transactions]  │
└─────────────────────────────────────┘

Tab 1: Top Up
  - Bank accounts display
  - Amount input
  - Bank used input
  - Transfer date
  - Proof upload
  - Submit button

Tab 2: History
  - List of submitted payments
  - Status badges (Pending/Approved/Rejected)
  - Admin notes

Tab 3: Transactions
  - Credit transactions
  - Type icons (↓ ⊕ ↑ ⟳ →)
  - Amount changes (+/-)
```

---

## 🧪 Testing Scenarios

### **Test 1: Top-Up Flow**

```
1. User submits top-up: Rp 50,000
   → Payment created (status: pending)

2. Admin approves top-up
   → Payment status → approved
   → User credit_balance += 50,000
   → Credit transaction created (type: topup)

3. User checks Wallet
   → Balance increased by 50,000
   → Transaction appears in Transactions tab
```

### **Test 2: Subscription Flow**

```
1. User submits subscription: Monthly (Rp 50,000)
   → Payment created (status: pending)

2. Admin approves subscription
   → Payment status → approved
   → User subscription_end += 30 days
   → VPN enabled

3. User checks Dashboard
   → Subscription active
   → Days remaining updated
```

### **Test 3: Credit Transaction Display**

```
User Wallet → Transactions tab:

[↓] Top-up approved     +Rp 50,000
[→] Transfer to user    -Rp 20,000
[⟳] Auto-renewal        -Rp 50,000
[⊕] Bonus credit        +Rp 10,000
```

---

## ⚠️ Important Notes

### **Payment Validation:**

1. **Cannot submit if pending payment exists**
   - User must wait for admin approval
   - Prevents duplicate payments

2. **Amount validation**
   - Must be ≥ 90% of plan price
   - Allows small difference for bank fees

3. **File validation**
   - JPEG/PNG/PDF only
   - Max 5MB

### **Credit Balance:**

- **Top-up** → Credit added on approval
- **Subscription** → Credit NOT used (direct payment)
- **Transfer** → Credit transferred between users
- **Auto-renewal** → Credit deducted automatically

---

## 🔐 Security Considerations

### **Fraud Detection (Credit Transfer):**

```javascript
// Fraud checks:
- Amount limits (max 1M per transfer)
- Daily limits (max 5M per day)
- Transfer count (max 10 per day)
- Velocity checks (time between transfers)
- New user restrictions
- Round amount detection
- Self-transfer prevention
```

### **Payment Approval:**

- Admin only
- Cannot approve already processed payments
- Creates audit trail (approved_by, approved_at)
- Email notification to user

---

## 📊 Response Examples

### **Approve Top-Up Response:**

```json
{
  "message": "Payment approved successfully",
  "type": "topup",
  "credit_added": 50000,
  "days_added": 0
}
```

### **Approve Subscription Response:**

```json
{
  "message": "Payment approved successfully",
  "type": "subscription",
  "credit_added": 0,
  "days_added": 30
}
```

---

## 🐛 Troubleshooting

### **Issue: Top-up approved but balance not updated**

**Possible causes:**
1. Payment plan not set to 'topup'
2. duration_days > 0 (treated as subscription)
3. Database update failed
4. Frontend cache (need refresh)

**Solution:**
```javascript
// Check payment data
const isTopup = paymentData.plan === 'topup' || 
                !paymentData.duration_days;

// Verify user update
console.log('Credit balance updated:', newBalance);

// Check transaction created
console.log('Transaction created:', transactionRef.id);
```

### **Issue: Payment stuck in pending**

**Solution:**
1. Admin must approve/reject
2. Check if admin received notification
3. Verify admin has correct permissions
4. Check Firestore security rules

---

## ✅ Implementation Checklist

### **Backend:**
- [x] Payment submit endpoint
- [x] Payment approve endpoint
- [x] Payment reject endpoint
- [x] Top-up detection logic
- [x] Credit balance update on top-up
- [x] Credit transaction creation
- [x] Email notifications

### **Frontend:**
- [x] Wallet component with Top Up tab
- [x] Top Up form
- [x] File upload with preview
- [x] Topup History tab
- [x] Transactions tab
- [x] Balance display
- [x] Status badges
- [x] Error handling

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `backend/routes/billing.js` | Payment submission |
| `backend/routes/admin-billing.js` | Payment approval/rejection |
| `backend/routes/credit.js` | Credit transactions & transfers |
| `frontend/components/Wallet.js` | User wallet UI |
| `frontend/components/AdminCredit.js` | Admin credit management |

---

**Status:** ✅ COMPLETE - Payment & Credit Transaction flow fully integrated
**Last Updated:** 2026-03-07
