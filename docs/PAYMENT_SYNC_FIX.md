# 💳 Top Up / Payment Sync Fix

## 📅 March 6, 2026

---

## 🎯 Issue

Frontend top up functionality tidak sync dengan backend API.

### Problems Identified
1. ❌ PaymentForm menggunakan style inline (old pattern)
2. ❌ Tidak menggunakan `apiFetch` dari store
3. ❌ Tidak menggunakan design system yang sama
4. ❌ Error handling tidak konsisten
5. ❌ Tidak ada notifikasi toast

---

## ✅ Solution

Created new `Payment.js` component dengan:

### Improvements
1. ✅ Uses `apiFetch` from store (consistent with other components)
2. ✅ Uses `useUIStore` for notifications
3. ✅ Modern Tailwind design (matches other components)
4. ✅ Better error handling
5. ✅ Toast notifications
6. ✅ Responsive design
7. ✅ Proper form validation
8. ✅ Bank account display with QR support

---

## 📝 Changes

### New Component: `Payment.js`

**File:** `/frontend/components/Payment.js`

**Features:**
- Submit payment proof dengan validation
- View bank accounts dengan QR code support
- Payment history dengan status badges
- Plan selection (Monthly, Quarterly, Yearly)
- Amount validation
- File upload dengan preview
- Date validation
- Notes field

**API Endpoints Used:**
```javascript
GET  /billing/plans      // Get plans & bank accounts
GET  /billing/history    // Get payment history
POST /billing/submit     // Submit payment proof
```

---

### Updated Files

#### 1. `pages/index.js`
```diff
- import PaymentForm from '../components/PaymentForm';
+ import Payment from '../components/Payment';

const PAGE_COMPONENTS = {
-  payment: PaymentForm,
+  payment: Payment,
}
```

#### 2. `components/Payment.js` (NEW)
- Complete rewrite dengan modern pattern
- Sync dengan backend API
- Better UX dan validation

---

## 🎨 Design Features

### Plan Selection
```
┌────────────────────────────────────────────┐
│  Monthly        Quarterly      Yearly      │
│  Rp 50,000      Rp 135,000     Rp 480,000  │
│  30 days        90 days        365 days    │
│  ✓ Selected                                │
└────────────────────────────────────────────┘
```

### Bank Account Display
```
┌────────────────────────────────────────────┐
│  🏦 BCA                                    │
│  PT VPN Access                             │
│  ┌────────────────────────────────────┐   │
│  │ Account Number                      │   │
│  │ 1234567890                          │   │
│  └────────────────────────────────────┘   │
│  [QR Code Image]                           │
└────────────────────────────────────────────┘
```

### Payment History
```
┌────────────────────────────────────────────┐
│  Rp 50,000                    [Pending]    │
│  Monthly • 30 days                         │
│  🏦 BCA         📅 Transfer: Mar 6, 2026  │
│  🕐 Submitted: Mar 6, 2026                 │
└────────────────────────────────────────────┘
```

---

## 🔧 Backend Sync

### API Compatibility

**Backend Endpoint:** `POST /billing/submit`

**Request:**
```javascript
FormData {
  amount: "50000",
  plan: "monthly",
  bank_from: "BCA",
  transfer_date: "2026-03-06",
  notes: "Optional notes",
  proof: File // image/pdf
}
```

**Response:**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "payment_id",
    "user_id": "user_id",
    "amount": 50000,
    "plan": "monthly",
    "status": "pending",
    ...
  }
}
```

### Validation Sync

**Frontend Validation:**
```javascript
// Amount validation
if (amount < plan.price * 0.9) {
  throw new Error(`Amount must be at least ${formatCurrency(plan.price)}`);
}

// Date validation
if (!transferDate) {
  throw new Error('Transfer date is required');
}

// File validation
if (!proofFile) {
  throw new Error('Proof of transfer is required');
}
```

**Backend Validation:**
```javascript
// Amount validation
if (parsedAmount < planInfo.price * 0.9) {
  return res.status(400).json({ error: 'Invalid amount' });
}

// Date validation
if (!transfer_date) {
  return res.status(400).json({ error: 'Transfer date is required' });
}

// File validation
if (!req.file) {
  return res.status(400).json({ error: 'Proof of transfer is required' });
}
```

✅ **Perfect Match!** Frontend dan backend validation sudah sync.

---

## 🧪 Testing Checklist

### Submit Payment Flow
- [ ] Select plan (Monthly/Quarterly/Yearly)
- [ ] Amount auto-fills correctly
- [ ] Enter bank used (e.g., "BCA")
- [ ] Select transfer date
- [ ] Upload proof (image/PDF)
- [ ] Preview shows for images
- [ ] Add optional notes
- [ ] Submit form
- [ ] Success notification appears
- [ ] Auto redirect to history tab
- [ ] Payment appears in history

### Validation Tests
- [ ] Amount too low → Error
- [ ] No transfer date → Error
- [ ] No proof file → Error
- [ ] Wrong file type → Error
- [ ] File too large (>5MB) → Error
- [ ] Pending payment exists → Error

### Bank Account Display
- [ ] Bank accounts load correctly
- [ ] QR codes display if available
- [ ] Account numbers show correctly
- [ ] Account names show correctly
- [ ] Descriptions display

### Payment History
- [ ] History loads correctly
- [ ] Status badges show (Pending/Approved/Rejected)
- [ ] Amount formatted correctly
- [ ] Dates formatted correctly
- [ ] Admin notes display if available

---

## 📊 Before vs After

| Feature | Before (PaymentForm) | After (Payment) |
|---------|---------------------|-----------------|
| **Design** | Inline styles | Tailwind CSS |
| **State Management** | Local state | useUIStore + apiFetch |
| **Notifications** | Manual messages | Toast notifications |
| **Validation** | Basic | Comprehensive |
| **Error Handling** | Console.log | User-friendly messages |
| **Bank Display** | Basic | With QR support |
| **History** | Basic table | Card layout |
| **Responsive** | Limited | Full support |
| **Backend Sync** | ⚠️ Partial | ✅ Complete |

---

## 🎯 API Endpoints Reference

### GET /billing/plans
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
    }
  ],
  "bank_accounts": [
    {
      "id": "bank_id",
      "bank": "BCA",
      "account_number": "1234567890",
      "account_name": "PT VPN Access",
      "description": "Transfer instructions",
      "qr_code_url": "https://..."
    }
  ]
}
```

### GET /billing/history
**Query:** `?limit=10`

**Response:**
```json
{
  "payments": [
    {
      "id": "payment_id",
      "user_id": "user_id",
      "amount": 50000,
      "plan": "monthly",
      "plan_label": "Monthly",
      "duration_days": 30,
      "bank_from": "BCA",
      "transfer_date": "2026-03-06T00:00:00.000Z",
      "proof_image_url": "/uploads/proofs/proof_123.jpg",
      "status": "pending",
      "admin_note": "",
      "created_at": "2026-03-06T10:00:00.000Z",
      "updated_at": "2026-03-06T10:00:00.000Z"
    }
  ]
}
```

### POST /billing/submit
**Request:** FormData

**Response:**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "payment_id",
    "user_id": "user_id",
    "amount": 50000,
    "plan": "monthly",
    "status": "pending",
    ...
  }
}
```

---

## 🔒 Security Features

### File Upload Security
- ✅ File type validation (JPEG, PNG, PDF only)
- ✅ File size limit (5MB max)
- ✅ Multer middleware on backend
- ✅ Secure filename generation
- ✅ Stored in protected directory

### Data Validation
- ✅ Amount validation (min 90% of plan price)
- ✅ Date validation (required)
- ✅ Plan validation (must be valid plan ID)
- ✅ Pending payment check (prevent duplicates)

### Authentication
- ✅ Token required for all endpoints
- ✅ User ID extracted from token
- ✅ Users can only view their own payments

---

## 🎨 UI Components

### Plan Cards
```jsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {Object.entries(PLANS).map(([planId, plan]) => (
    <div
      key={planId}
      onClick={() => handlePlanChange(planId)}
      className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
        selectedPlan === planId
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 bg-gray-50 hover:border-primary/50'
      }`}
    >
      <div className="text-sm font-semibold text-dark mb-1">
        {plan.label}
      </div>
      <div className="text-lg font-bold text-primary mb-1">
        {formatCurrency(plan.price)}
      </div>
      <div className="text-xs text-gray-400">{plan.duration} days</div>
    </div>
  ))}
</div>
```

### Status Badges
```jsx
function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
```

---

## 📱 Responsive Design

### Mobile (< 640px)
- Single column plan selection
- Stacked form fields
- Full-width buttons
- Optimized touch targets

### Tablet (640px - 1024px)
- 2-3 column plan selection
- Grid form fields where appropriate
- Optimized spacing

### Desktop (> 1024px)
- 3 column plan selection
- Optimal form layout
- Enhanced hover effects

---

## ✅ Completion Status

```
Component Created:    ✅ COMPLETE
API Integration:      ✅ COMPLETE
Validation Sync:      ✅ COMPLETE
Error Handling:       ✅ COMPLETE
Design System:        ✅ COMPLETE
Responsive:           ✅ COMPLETE
Documentation:        ✅ COMPLETE
Testing:              ⏳ Pending
```

---

## 🚀 Usage

### User Flow
```
1. Navigate to Payment page
2. View available bank accounts
3. Select plan (Monthly/Quarterly/Yearly)
4. Amount auto-fills
5. Enter bank used
6. Select transfer date
7. Upload proof of transfer
8. Add optional notes
9. Submit payment
10. See success notification
11. Auto-switch to history tab
12. View payment in history
```

### Admin Flow
```
1. Admin receives notification
2. Navigate to Admin Billing
3. View pending payment
4. Review proof image
5. Approve or reject
6. User receives notification
7. Subscription extended if approved
```

---

## 📞 Troubleshooting

### Issue: Payment not submitting
**Solution:**
- Check network tab for errors
- Verify backend is running
- Check token is valid
- Ensure file size < 5MB

### Issue: Bank accounts not showing
**Solution:**
- Check `/billing/plans` endpoint
- Verify billing is enabled
- Check bank accounts in database

### Issue: Validation errors
**Solution:**
- Ensure amount >= 90% of plan price
- Select valid transfer date
- Upload valid file type (JPEG/PNG/PDF)

---

**Status:** ✅ SYNC COMPLETE  
**Backend API:** ✅ Compatible  
**Frontend Component:** ✅ Updated  
**Validation:** ✅ Synced  
**Testing:** Ready

**Last Updated:** March 6, 2026
