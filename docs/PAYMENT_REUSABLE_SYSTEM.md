# Reusable Payment System

## Overview
Sistem pembayaran yang reusable untuk Top Up dan Buy Plan dengan komponen yang dapat digunakan kembali.

## Components

### 1. `PaymentForm.js` - Main Component
Komponen utama yang mendukung 3 mode:
- **`topup`**: Untuk top up credit/saldo
- **`plan`**: Untuk pembelian subscription plan
- **`custom`**: Untuk pembayaran custom

#### Usage Example:

```jsx
// Top Up Mode
<PaymentForm
  mode="topup"
  bankAccounts={bankAccounts}
  onSuccess={handleTopupSuccess}
  defaultAmount={50000}
/>

// Buy Plan Mode
<PaymentForm
  mode="plan"
  plans={plans}
  bankAccounts={bankAccounts}
  onSuccess={handlePaymentSuccess}
  defaultAmount={plans[0]?.price}
/>
```

#### Props:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | string | 'topup' | Mode pembayaran ('topup', 'plan', 'custom') |
| `bankAccounts` | array | [] | Daftar bank accounts untuk transfer |
| `plans` | array | [] | Daftar available plans (untuk mode 'plan') |
| `onSuccess` | function | null | Callback setelah payment berhasil |
| `defaultAmount` | number | 50000 | Default amount yang ditampilkan |

---

### 2. `BankAccountsDisplay` - Bank Info Component
Menampilkan daftar bank accounts dengan format yang konsisten.

#### Usage:
```jsx
<BankAccountsDisplay bankAccounts={bankAccounts} />
```

#### Features:
- Menampilkan bank name, account name, account number
- Support QR code display
- Responsive design dengan gradient background

---

### 3. `PaymentHistory` - History Display Component
Menampilkan riwayat pembayaran/top up dengan format yang sama.

#### Usage:
```jsx
<PaymentHistory
  payments={payments}
  emptyMessage="No payment history yet"
/>
```

#### Features:
- Status badge (pending, approved, rejected, blocked)
- Payment details (amount, bank, dates)
- Admin notes display
- Empty state handling

---

## Refactored Components

### `Wallet.js`
- Menggunakan `PaymentForm` dengan `mode="topup"`
- Menggunakan `BankAccountsDisplay` untuk bank info
- Menggunakan `PaymentHistory` untuk top up history
- **Lines reduced**: ~487 → ~232 (52% reduction)

### `Payment.js`
- Menggunakan `PaymentForm` dengan `mode="plan"`
- Menggunakan `BankAccountsDisplay` untuk bank info
- Menggunakan `PaymentHistory` untuk payment history
- **Lines reduced**: ~535 → ~191 (64% reduction)

---

## Benefits

### ✅ Code Reusability
- Single source of truth untuk payment form logic
- DRY (Don't Repeat Yourself) principle
- Easier maintenance

### ✅ Consistency
- Same UI/UX untuk top up dan buy plan
- Consistent validation dan error handling
- Unified success/error feedback

### ✅ Maintainability
- Update form logic di satu tempat
- Easier to add new features
- Less code to maintain

### ✅ Testability
- Easier to test single component
- Consistent behavior across app
- Isolated payment logic

---

## File Upload Validation

Both components use the same validation:
- **Allowed types**: JPEG, JPG, PNG, PDF
- **Max size**: 5MB
- **Preview**: Image preview sebelum submit

---

## Form Validation

- **Amount**: Minimum Rp 10,000 (topup) atau sesuai plan price
- **Transfer Date**: Required
- **Proof of Transfer**: Required
- **Bank From**: Required (user's bank/e-wallet)

---

## Future Enhancements

1. **Add more payment methods**: E-wallet integration, QRIS
2. **Auto-detect bank**: From transfer date and amount
3. **Payment reminders**: For pending payments
4. **Recurring payments**: Auto-renewal support
5. **Payment analytics**: Charts dan statistics

---

## Related Files
- `/frontend/components/PaymentForm.js` - Main reusable component
- `/frontend/components/Wallet.js` - Refactored wallet component
- `/frontend/components/Payment.js` - Refactored payment component
- `/backend/routes/billing.js` - Backend payment endpoints
- `/backend/routes/payment-settings.js` - Bank accounts & plans
