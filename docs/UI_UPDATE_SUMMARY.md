# UI Updates: Top Up, Subscription, dan Credit Transfer

## ✅ Changes Summary

### 1. **Sidebar Menu Update**

**Before:**
- Dashboard
- Wallet
- Payment ❌ (Generic, unclear)
- Referral

**After:**
- Dashboard
- Wallet
- **Top Up** ✅ (Clear: for adding credit)
- **Subscription** ✅ (Clear: for buying plans)
- Referral

---

### 2. **Payment Page Separation**

#### **Top Up Page** (`activePage === 'topup'`)
- **Title:** "Top Up Saldo"
- **Icon:** 💳 (add_card)
- **Mode:** `mode="topup"`
- **Functionality:** 
  - User can enter any amount (min Rp 10,000)
  - No plan selection required
  - Credit added to balance after admin approval

#### **Subscription Page** (`activePage === 'subscription'`)
- **Title:** "Beli Paket Subscription"
- **Icon:** 👑 (premium)
- **Mode:** `mode="plan"`
- **Functionality:**
  - User selects plan (Monthly/Quarterly/Yearly)
  - Amount auto-filled based on plan
  - Subscription extended after admin approval

---

### 3. **Credit Transfer UI**

**New Component:** `CreditTransferForm.js`

**Location:** Wallet > Transfer tab

**Features:**
- Transfer credit to another user via email
- Minimum transfer: Rp 1,000
- Optional notes/message
- Real-time validation
- iOS-style design

**UI Flow:**
```
Wallet Component
    ↓
Tabs: [Top Up] [Transfer] [History] [Transactions]
                          ↓
              ┌──────────────────────┐
              │  💸 Transfer Credit  │
              ├──────────────────────┤
              │ Email Penerima       │
              │ [user@example.com]   │
              │                      │
              │ Nominal Transfer     │
              │ [Rp 50,000]          │
              │                      │
              │ Catatan (Opsional)   │
              │ [Add message...]     │
              │                      │
              │  [→ Transfer Credit] │
              └──────────────────────┘
```

---

## 📝 Files Modified

### Frontend

| File | Changes |
|------|---------|
| `frontend/pages/index.js` | Menu items updated, PAGE_COMPONENTS mapping |
| `frontend/components/Payment.js` | Auto-detect mode from activePage |
| `frontend/components/Wallet.js` | Added Transfer tab, import CreditTransferForm |
| `frontend/components/CreditTransferForm.js` | **NEW** - Transfer UI component |

### Backend

| File | Changes |
|------|---------|
| `backend/routes/billing.js` | Enhanced validation for topup vs subscription |
| `backend/routes/settings.js` | Unified billing settings collection |

---

## 🎨 UI Design

### Top Up Page
```
┌─────────────────────────────────┐
│  💳 Top Up Saldo                │
├─────────────────────────────────┤
│  🏦 Bank Accounts               │
│  ┌───────────────────────────┐ │
│  │ BCA: 4330427430          │ │
│  │ [Copy]                    │ │
│  └───────────────────────────┘ │
│                                 │
│  Amount: [Rp 50,000]           │
│  Bank: [BCA ▼]                 │
│  Transfer Date: [2026-03-07]   │
│  Proof: [Choose File]          │
│                                 │
│  [Submit Top Up]               │
└─────────────────────────────────┘
```

### Subscription Page
```
┌─────────────────────────────────┐
│  👑 Beli Paket Subscription     │
├─────────────────────────────────┤
│  🏦 Bank Accounts               │
│  ┌───────────────────────────┐ │
│  │ BCA: 4330427430          │ │
│  │ [Copy]                    │ │
│  └───────────────────────────┘ │
│                                 │
│  Select Plan:                   │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Monthly│Quarterly│Yearly │   │
│  │Rp 50K│Rp 135K│Rp 480K│   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  Bank: [BCA ▼]                 │
│  Transfer Date: [2026-03-07]   │
│  Proof: [Choose File]          │
│                                 │
│  [Submit Subscription]         │
└─────────────────────────────────┘
```

### Transfer Tab (in Wallet)
```
┌─────────────────────────────────┐
│  💸 Transfer Credit             │
├─────────────────────────────────┤
│  📧 Email Penerima              │
│  [user@example.com]            │
│                                 │
│  💰 Nominal Transfer            │
│  [Rp 50,000]                   │
│  Minimal: Rp 1,000             │
│                                 │
│  📝 Catatan (Opsional)          │
│  [Add message...]              │
│                                 │
│  [→ Transfer Credit]           │
│                                 │
│  ℹ️ Info Transfer:              │
│  • Credit langsung ditransfer  │
│  • Pastikan email benar        │
│  • Tidak dapat dibatalkan       │
└─────────────────────────────────┘
```

---

## 🔄 User Flow

### Top Up Flow
1. User clicks "Top Up" in sidebar
2. Enters desired amount (min Rp 10,000)
3. Selects bank, uploads proof
4. Submits → Admin approves → Credit added to balance

### Subscription Flow
1. User clicks "Subscription" in sidebar
2. Selects plan (Monthly/Quarterly/Yearly)
3. Amount auto-filled
4. Uploads proof → Admin approves → Subscription extended

### Credit Transfer Flow
1. User goes to Wallet
2. Clicks "Transfer" tab
3. Enters recipient email
4. Enters amount (min Rp 1,000)
5. Optional: adds message
6. Submits → Credit transferred instantly

---

## 📊 API Endpoints Used

| Action | Endpoint | Method |
|--------|----------|--------|
| Top Up | `/api/billing/submit` | POST (plan='topup') |
| Subscription | `/api/billing/submit` | POST (plan='monthly' etc.) |
| Credit Transfer | `/api/credit/transfer` | POST |

---

## ✅ Testing Checklist

- [ ] Sidebar shows "Top Up" and "Subscription" separately
- [ ] Top Up page only shows topup form
- [ ] Subscription page only shows plan selection
- [ ] Wallet has "Transfer" tab
- [ ] Credit transfer validates email format
- [ ] Credit transfer validates minimum amount
- [ ] All forms have proper iOS-style design
- [ ] Dark mode works correctly
- [ ] Mobile responsive

---

## 🎯 Benefits

1. **Clear UX**: Users know exactly where to go
2. **Separated Concerns**: Top up ≠ Subscription
3. **Credit Transfer**: Easy P2P credit transfer
4. **Better Navigation**: Intuitive menu labels
5. **Consistent Design**: All forms follow iOS style

---

**Status:** ✅ Complete  
**Date:** 2026-03-07  
**Impact:** Improved navigation and new credit transfer feature
