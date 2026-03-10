# Credit & Auto-Renewal System

## Overview
Sistem kredit dan auto-renewal untuk VPN Access Manager. User dapat melakukan top-up credit yang akan digunakan untuk pembayaran otomatis (auto-renewal) subscription VPN mereka.

## Features

### User Features
- **Credit Balance** - Cek saldo credit
- **Top-Up** - Request top-up credit dengan upload bukti transfer
- **Transaction History** - Lihat riwayat transaksi credit
- **Auto-Renewal** - Aktifkan/mematikan auto-renewal untuk subscription VPN
- **Plan Selection** - Pilih plan preferensi untuk auto-renewal (Monthly/Quarterly/Yearly)

### Admin Features
- **Credit Overview** - Statistik credit yang issued, used, dan user balances
- **Top-Up Approval** - Approve/reject request top-up dari user
- **Transaction Management** - Lihat semua transaksi credit
- **Manual Credit/Deduction** - Tambah/kurang credit user secara manual

## API Endpoints

### User Endpoints

#### Get Credit Balance
```
GET /api/credit/balance
Headers: Authorization: Bearer <token>
Response: { "balance": 0, "formatted": "Rp0", "currency": "IDR" }
```

#### Get Transaction History
```
GET /api/credit/transactions?limit=50&type=topup
Headers: Authorization: Bearer <token>
Response: { "transactions": [...] }
```

#### Submit Top-Up Request
```
POST /api/credit/topup
Headers: 
  Authorization: Bearer <token>
  Content-Type: application/json
Body: {
  "amount": 100000,
  "bank_from": "BCA",
  "transfer_date": "2024-01-15",
  "notes": "Optional notes"
}
```

#### Get Top-Up History
```
GET /api/credit/topups?limit=50&status=pending
Headers: Authorization: Bearer <token>
```

#### Get Auto-Renewal Settings
```
GET /api/credit/auto-renewal
Headers: Authorization: Bearer <token>
Response: {
  "auto_renewal": {
    "enabled": false,
    "preferred_plan": "monthly",
    "min_balance_required": 0
  },
  "current_balance": 0
}
```

#### Update Auto-Renewal Settings
```
PATCH /api/credit/auto-renewal
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body: {
  "enabled": true,
  "preferred_plan": "monthly",
  "min_balance_required": 50000
}
```

### Admin Endpoints

#### Get Credit Statistics
```
GET /api/admin/credit/credit/stats
Headers: Authorization: Bearer <token>
Response: {
  "stats": {
    "total_credit_issued": 0,
    "total_credit_used": 0,
    "total_topups_pending": 0,
    "total_topups_approved": 0,
    "total_topups_rejected": 0,
    "users_with_balance": 0,
    "total_user_balance": 0
  }
}
```

#### Get All Top-Ups
```
GET /api/admin/credit/topups?status=pending&limit=50
Headers: Authorization: Bearer <token>
```

#### Approve Top-Up
```
POST /api/admin/credit/topups/:id/approve
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body: { "admin_note": "Approved" }
```

#### Reject Top-Up
```
POST /api/admin/credit/topups/:id/reject
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body: { "reason": "Invalid proof" }
```

#### Add Credit to User (Manual)
```
POST /api/admin/credit/users/:id/add-credit
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body: {
  "amount": 100000,
  "reason": "Bonus credit"
}
```

#### Deduct Credit from User (Manual)
```
POST /api/admin/credit/users/:id/deduct-credit
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body: {
  "amount": 50000,
  "reason": "Refund"
}
```

#### Get Credit Transactions
```
GET /api/admin/credit/credit/transactions?limit=100&type=topup
Headers: Authorization: Bearer <token>
```

## Auto-Renewal System

### How It Works

1. User mengaktifkan auto-renewal di halaman Wallet
2. User memilih plan preferensi (Monthly/Quarterly/Yearly)
3. Script auto-renewal berjalan setiap hari (2 AM)
4. Script mengecek user dengan auto-renewal enabled
5. **Low Balance Alert (NEW)**: Jika balance < plan price dan subscription ending soon (≤5 days):
   - Send email notification ke user
   - Display warning di Wallet page
   - Suggest top-up dengan quick action button
6. Jika subscription expiring dalam 3 hari atau sudah expired:
   - Cek credit balance user
   - Jika balance cukup: deduct credit dan extend subscription
   - Jika balance kurang: log failed attempt (opsional: disable auto-renewal)

### Low Balance Alert Features

**Email Notification:**
- Beautiful HTML email template
- Shows current balance, required amount, and deficit
- Display subscription expiry date
- Quick "Top Up Now" button linking to wallet
- Sent when balance < plan price and subscription ending in ≤5 days

**UI Warning:**
```
⚠️ Low Balance Alert
Your balance (Rp 30,000) is below the required amount for 
Monthly (Rp 50,000). Please top-up to avoid service interruption.
Deficit: Rp 20,000
Subscription expires: Jan 15, 2024 (2 days remaining)
[⚡ Top Up Now]
```

### Email Configuration

Add to `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=VPN Access Manager <your-email@gmail.com>
FRONTEND_URL=http://localhost:3001
```

**Gmail Setup:**
1. Enable 2FA on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the app password for `SMTP_PASS`

### Running Auto-Renewal

#### Manual Execution
```bash
cd backend
node scripts/auto-renewal.js
```

#### Scheduled Execution (Cron)
Edit crontab:
```bash
crontab -e
```

Add this line to run daily at 2 AM:
```
0 2 * * * cd /path/to/vpn-access/backend && node scripts/auto-renewal.js >> logs/auto-renewal.log 2>&1
```

#### Using PM2 (Recommended for Production)
```bash
# Install pm2
npm install -g pm2

# Add auto-renewal as cron job
pm2 start scripts/auto-renewal.js --interpreter node --cron "0 2 * * *" --name auto-renewal

# View logs
pm2 logs auto-renewal
```

## Database Collections

### users
```javascript
{
  email: string,
  credit_balance: number, // Default: 0
  auto_renewal_enabled: boolean, // Default: false
  auto_renewal_plan: string, // 'monthly' | 'quarterly' | 'yearly'
  auto_renewal_min_balance: number, // Default: 0
  subscription_end: string, // ISO date
  subscription_plan: string,
  vpn_enabled: boolean,
  // ... other fields
}
```

### credit_transactions
```javascript
{
  user_id: string,
  type: string, // 'topup' | 'credit' | 'deduction' | 'auto_renewal'
  amount: number,
  balance_before: number,
  balance_after: number,
  description: string,
  related_topup_id: string, // Optional
  related_payment_id: string, // Optional
  admin_id: string, // Optional (for manual credit/deduction)
  plan: string, // Optional (for auto_renewal)
  duration_days: number, // Optional (for auto_renewal)
  created_at: string,
}
```

### topups
```javascript
{
  user_id: string,
  amount: number,
  bank_from: string,
  transfer_date: string,
  status: string, // 'pending' | 'approved' | 'rejected'
  notes: string,
  admin_note: string,
  approved_by: string, // User ID of admin
  approved_at: string,
  rejected_at: string,
  created_at: string,
  updated_at: string,
}
```

### auto_renewal_logs
```javascript
{
  user_id: string,
  user_email: string,
  status: string, // 'success' | 'failed_insufficient_balance' | 'error'
  plan: string,
  required_amount: number,
  current_balance: number,
  amount_charged: number,
  balance_before: number,
  balance_after: number,
  previous_subscription_end: string,
  new_subscription_end: string,
  days_until_expiry: number,
  error_message: string,
  attempted_at: string,
}
```

## Pricing Plans (Default)

```javascript
const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
  yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
};
```

To change prices, edit `backend/routes/credit.js` and `backend/scripts/auto-renewal.js`.

## Frontend Components

- `components/Wallet.js` - User wallet page (balance, top-up, transactions, auto-renewal)
- `components/AdminCredit.js` - Admin credit management page
- `pages/index.js` - Updated to include wallet page
- `components/Layout.js` - Updated sidebar with Wallet and Credit Mgmt menu

## Security Notes

1. All endpoints require authentication (Bearer token)
2. Admin endpoints verify user role = 'admin'
3. Rate limiting applied to prevent abuse
4. Top-up requests require admin approval
5. Credit transactions are logged for audit

## Testing

### Test User Flow
1. Login as user
2. Navigate to Wallet page
3. Click "Top Up" and submit request
4. Wait for admin approval
5. After approval, check balance updated
6. Enable auto-renewal and select plan

### Test Admin Flow
1. Login as admin
2. Navigate to Admin Panel > Credit Mgmt
3. View overview statistics
4. Approve/reject pending top-ups
5. View transaction history
6. Test manual credit/deduction

## Troubleshooting

### Auto-renewal not working
- Check if script is scheduled (cron/PM2)
- Verify `auto_renewal_enabled` field in users collection
- Check logs for errors

### Top-up approval not updating balance
- Verify admin has correct permissions
- Check Firestore security rules
- Review transaction logs

### Balance not displaying
- Check API endpoint response
- Verify Firebase authentication
- Inspect browser console for errors
