# VPN Access Backend

VPN Access Manager built with Node.js, Express, Firebase, and WireGuard.

## Features

- 🔐 Firebase Authentication
- 📱 WireGuard VPN configuration generation
- 📊 Admin panel for user management
- 🔄 QR Code generation for easy client setup
- 🛡️ Role-based access control (Admin/User)
- 📱 Multi-device support (max 3 devices per user)
- 💰 Billing system with manual transfer validation
- 🛡️ Rate limiting & security middleware
- 📈 Payment tracking & subscription management
- 📧 Email notifications (Nodemailer)
- ⏰ Automated cron jobs for billing reminders
- 💳 Credit transfer system with fraud detection ⭐

## Prerequisites

- Node.js 18+ 
- npm
- Linux server (Ubuntu, Debian, CentOS, RHEL, Fedora, AlmaLinux, or Rocky)
- Root/sudo access
- Firebase project with Admin SDK credentials

## Installation

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Firebase Admin SDK (from your service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# WireGuard (auto-configured by setup script)
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=your-server-public-key
WG_SERVER_ENDPOINT=your-server-ip:51820
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/24
```

### 3. Quick Setup (Recommended)

Automatically configure WireGuard with a single command:

```bash
sudo npm run setup:vpn
```

This script will:
- ✅ Install WireGuard if not present
- ✅ Generate WireGuard keypair
- ✅ Auto-detect server public IP
- ✅ Configure firewall (UFW/firewalld)
- ✅ Enable IP forwarding
- ✅ Create WireGuard config at `/etc/wireguard/wg0.conf`
- ✅ Update `.env` with server credentials
- ✅ Backup existing configurations
- ✅ Start WireGuard service

**Log file:** `logs/setup-wireguard.log`

### 4. Manual WireGuard Setup (Alternative)

If you prefer manual setup:

```bash
# Install WireGuard
sudo apt update && sudo apt install -y wireguard

# Generate keypair
wg genkey | sudo tee /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key

# Get public key
cat /etc/wireguard/public.key

# Create config
sudo nano /etc/wireguard/wg0.conf
```

Example `/etc/wireguard/wg0.conf`:
```ini
[Interface]
PrivateKey = <your-private-key>
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

### 5. Enable IP Forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-wireguard.conf
```

### 6. Configure Firewall

```bash
# UFW
sudo ufw allow 51820/udp

# OR firewalld
sudo firewall-cmd --permanent --add-port=51820/udp
sudo firewall-cmd --reload
```

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/verify` | Verify Firebase token & get/create user | Public |
| GET | `/api/auth/me` | Get current user info | Authenticated |

### VPN Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/vpn/generate` | Generate VPN config for device | Authenticated |
| GET | `/api/vpn/devices` | List user's devices | Authenticated |
| DELETE | `/api/vpn/device/:id` | Revoke own device | Authenticated |

### Admin Only

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/users` | List all users | Admin |
| GET | `/api/admin/users/:id` | Get user details | Admin |
| PATCH | `/api/admin/users/:id` | Toggle VPN access | Admin |
| GET | `/api/admin/devices` | List all devices | Admin |
| DELETE | `/api/admin/device/:id` | Revoke any device | Admin |
| GET | `/api/admin/stats` | Get VPN statistics | Admin |

### Billing & Payments

| Method | Endpoint | Description | Access | Rate Limit |
|--------|----------|-------------|--------|------------|
| GET | `/api/payment-settings/status` | Check billing status | Public | - |
| GET | `/api/payment-settings/banks` | Get bank accounts | Public | - |
| GET | `/api/billing/plans` | Get available pricing plans | Public | - |
| POST | `/api/billing/submit` | Submit payment proof | Authenticated | 5/hour |
| GET | `/api/billing/history` | View payment history | Authenticated | 30/hour |
| GET | `/api/billing/subscription` | Check subscription status | Authenticated | 30/hour |
| GET | `/api/billing/:id` | Get payment details | Authenticated | - |
| GET | `/api/admin/billing/payments` | List all payments | Admin | 100/hour |
| GET | `/api/admin/billing/payments/:id` | Get payment details | Admin | - |
| POST | `/api/admin/billing/payments/:id/approve` | Approve payment | Admin | 100/hour |
| POST | `/api/admin/billing/payments/:id/reject` | Reject payment | Admin | 100/hour |
| GET | `/api/admin/billing/stats` | Get billing statistics | Admin | 100/hour |
| GET | `/api/admin/billing/payments/pending/count` | Get pending count | Admin | - |

### Payment Settings (Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/payment-settings/settings` | Get payment settings | Admin |
| PATCH | `/api/payment-settings/settings` | Update payment settings | Admin |
| POST | `/api/payment-settings/toggle-billing` | Enable/disable billing | Admin |
| POST | `/api/payment-settings/banks` | Add bank account | Admin |
| PATCH | `/api/payment-settings/banks/:id` | Update bank account | Admin |
| DELETE | `/api/payment-settings/banks/:id` | Delete bank account | Admin |

### Admin Settings (Email & Cron) ⭐ NEW

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/settings/email` | Get email settings | Admin |
| PATCH | `/api/admin/settings/email` | Update email settings | Admin |
| POST | `/api/admin/settings/email/test` | Test email connection | Admin |
| GET | `/api/admin/settings/cron` | Get cron jobs settings | Admin |
| PATCH | `/api/admin/settings/cron` | Update cron schedule | Admin |
| POST | `/api/admin/settings/cron/trigger` | Trigger cron job manually | Admin |

### Credit Transfer ⭐ NEW

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/credit/balance` | Get credit balance | Authenticated |
| GET | `/api/credit/transactions` | Get transaction history | Authenticated |
| POST | `/api/credit/transfer` | Transfer credit to user | Authenticated |
| GET | `/api/credit/stats` | Get transfer statistics | Authenticated |
| GET | `/api/credit/fraud-config` | Get fraud detection config | Authenticated |

### Admin Credit Management ⭐ NEW

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/credit/transactions` | All credit transactions | Admin |
| GET | `/api/admin/credit/fraud-alerts` | Get fraud alerts | Admin |
| PATCH | `/api/admin/credit/fraud-alerts/:id/review` | Review fraud alert | Admin |
| POST | `/api/admin/credit/users/:id/add` | Add credit to user | Admin |
| POST | `/api/admin/credit/users/:id/deduct` | Deduct credit from user | Admin |
| GET | `/api/admin/credit/users/:id` | Get user credit info | Admin |
| GET | `/api/admin/credit/stats` | Credit statistics | Admin |
| GET | `/api/admin/credit/fraud-config` | Get fraud config | Admin |
| PATCH | `/api/admin/credit/fraud-config` | Update fraud config | Admin |

## User Roles

### Admin User
- Stored in Firestore `users` collection
- Field: `role: "admin"`
- Default new users: `role: "user"`

### Create Admin User

Via Firebase Console → Firestore:
1. Go to `users` collection
2. Find user document by UID
3. Set `role` field to `"admin"`
4. Set `vpn_enabled` to `true`

Or via script:
```javascript
db.collection('users').doc('USER_UID').update({
  role: 'admin',
  vpn_enabled: true
});
```

## Firestore Collections

### users
```javascript
{
  email: string,
  firebase_uid: string,
  role: "user" | "admin",
  vpn_enabled: boolean,
  created_at: string (ISO date)
}
```

### devices
```javascript
{
  user_id: string,
  device_name: string,
  public_key: string,
  private_key: string,
  ip_address: string,
  status: "active" | "revoked",
  created_at: string (ISO date)
}
```

### payments
```javascript
{
  user_id: string,
  amount: number,              // Amount paid in IDR
  plan: "monthly" | "quarterly" | "yearly",
  plan_label: string,          // Human-readable plan name
  duration_days: number,       // Subscription days (30/90/365)
  bank_from: string,           // Bank user transferred from
  transfer_date: string,       // Date of transfer (ISO)
  proof_image_url: string,     // Path to proof file
  proof_filename: string,      // Uploaded filename
  status: "pending" | "approved" | "rejected",
  notes: string,               // User notes
  admin_note: string,          // Admin rejection/approval note
  approved_by: string,         // Admin UID who approved
  approved_at: string,         // Approval timestamp (ISO)
  rejected_at: string,         // Rejection timestamp (ISO)
  created_at: string (ISO date),
  updated_at: string (ISO date)
}
```

### users (extended)
```javascript
{
  email: string,
  firebase_uid: string,
  role: "user" | "admin",
  vpn_enabled: boolean,
  subscription_end: string,    // Subscription expiry (ISO)
  subscription_plan: string,   // Current plan
  created_at: string (ISO date),
  updated_at: string (ISO date)
}
```

### payment_settings
```javascript
// Document ID: "config" in collection "payment_settings"
{
  billing_enabled: boolean,    // Master toggle for billing
  currency: string,            // Default: "IDR"
  min_amount: number,          // Minimum payment amount
  max_amount: number,          // Maximum payment amount
  auto_approve: boolean,       // Auto-approve payments (default: false)
  notification_email: string,  // Email for payment notifications
  created_at: string,
  updated_at: string,
  updated_by: string,          // Admin UID
}
```

### bank_accounts
```javascript
{
  bank: string,                // Bank name (e.g., "BCA", "Mandiri")
  account_number: string,      // Account number
  account_name: string,        // Account holder name
  description: string,         // Optional description/instructions
  qr_code_url: string,         // URL/path to QR code image (for QRIS)
  active: boolean,             // Show/hide from users
  order: number,               // Display order
  created_at: string,
  created_by: string,          // Admin UID
  updated_at: string,
  updated_by: string,          // Admin UID
}
```

### email_settings ⭐ NEW
```javascript
// Document ID: "config" in collection "email_settings"
{
  enabled: boolean,            // Master toggle for email
  smtp_host: string,           // SMTP server host
  smtp_port: number,           // SMTP port (587, 465, 25)
  smtp_user: string,           // SMTP username/email
  smtp_pass: string,           // SMTP password (app password)
  smtp_from: string,           // From address (e.g., "VPN Access <noreply@...>")
  notification_email: string,  // Admin email for notifications
  created_at: string,
  updated_at: string,
  updated_by: string,          // Admin UID
}
```

### cron_settings ⭐ NEW
```javascript
// Document ID: "config" in collection "cron_settings"
{
  enabled: boolean,            // Master toggle for cron jobs
  daily_summary_schedule: string,    // Cron expression (default: "0 8 * * *")
  expiry_check_schedule: string,     // Cron expression (default: "0 9 * * *")
  expired_check_schedule: string,    // Cron expression (default: "0 10 * * *")
  expiry_reminder_days: number[],    // Days to remind [7, 3, 1]
  created_at: string,
  updated_at: string,
  updated_by: string,          // Admin UID
}
```

### user_credits ⭐ NEW
```javascript
// Document ID: user_id in collection "user_credits"
{
  user_id: string,
  balance: number,             // Current credit balance
  total_earned: number,        // Total credit earned
  total_spent: number,         // Total credit spent
  created_at: string,
  updated_at: string,
}
```

### credit_transactions ⭐ NEW
```javascript
{
  user_id: string,             // User ID (for credit/debit)
  from_user_id: string,        // Sender (for transfers)
  to_user_id: string,          // Recipient (for transfers)
  type: "credit" | "debit" | "transfer",
  amount: number,
  balance_before: number,
  balance_after: number,
  description: string,
  metadata: object,
  status: "completed" | "pending" | "blocked" | "cancelled" | "pending_review",
  fraud_check: object,         // Fraud detection result
  created_at: string,
}
```

### fraud_alerts ⭐ NEW
```javascript
{
  user_id: string,
  transaction_id: string,
  risk_level: "low" | "medium" | "high" | "critical",
  is_fraudulent: boolean,
  reasons: string[],
  flags: string[],
  should_block: boolean,
  requires_review: boolean,
  status: "blocked" | "pending_review" | "approved" | "rejected",
  reviewed: boolean,
  reviewed_by: string,
  reviewed_at: string,
  admin_notes: string,
  created_at: string,
}
```

### fraud_log ⭐ NEW
```javascript
// Analytics log for all fraud detection events
{
  user_id: string,
  transaction_id: string,
  risk_level: string,
  flags: string[],
  action_taken: "blocked" | "flagged",
  created_at: string,
}
```

### fraud_config ⭐ NEW
```javascript
// Document ID: "settings" in collection "fraud_config"
{
  maxTransferAmount: number,       // Default: 1,000,000
  maxDailyTransfer: number,        // Default: 5,000,000
  maxTransfersPerDay: number,      // Default: 10
  minTransferInterval: number,     // Default: 5 (minutes)
  suspiciousAmountThreshold: number, // Default: 500,000
  new_userDays: number,            // Default: 7
  new_userMaxTransfer: number,     // Default: 100,000
  maxTransfersPerHour: number,     // Default: 3
  suspiciousRoundAmounts: number[], // Default: [100k, 200k, 500k, 1M]
  updated_at: string,
  updated_by: string,
}
```

## Project Structure

```
backend/
├── config/
│   └── firebase.js               # Firebase Admin SDK
├── routes/
│   ├── admin.js                  # Admin user management
│   ├── auth.js                   # Authentication
│   ├── vpn.js                    # VPN config generation
│   ├── billing.js                # User billing endpoints
│   ├── admin-billing.js          # Admin payment management
│   ├── payment-settings.js       # Bank accounts & payment settings
│   ├── admin-settings.js         # Email & cron configuration
│   ├── credit.js                 # Credit transfer API ⭐
│   └── admin-credit.js           # Admin credit management ⭐
├── services/
│   ├── wireguard.js              # WireGuard operations
│   ├── email.js                  # Email service (Nodemailer)
│   ├── cronJobs.js               # Scheduled jobs (Node Cron)
│   └── credit.js                 # Credit & fraud detection ⭐
├── middleware/
│   └── rateLimit.js              # Rate limiting & security
├── scripts/
│   └── setup-wireguard.js        # Auto WireGuard setup
├── logs/
│   └── setup-wireguard.log       # Setup logs
├── uploads/
│   └── proofs/                   # Payment proof images
├── .env                          # Environment variables
├── .env.example                  # Example environment
├── server.js                     # Main entry point
└── package.json
```

## Troubleshooting

### WireGuard won't start

```bash
# Check config syntax
sudo wg-quick strip wg0

# Check logs
journalctl -u wg-quick@wg0
cat logs/setup-wireguard.log
```

### Port 51820 already in use

```bash
# Find process using the port
sudo ss -tuln | grep 51820
sudo netstat -tuln | grep 51820

# Kill the process or change port in config
```

### IP forwarding not working

```bash
# Check current status
sysctl net.ipv4.ip_forward

# Enable temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Enable permanently
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-wireguard.conf
sudo sysctl -p /etc/sysctl.d/99-wireguard.conf
```

### Firewall blocking connections

```bash
# Check UFW status
sudo ufw status

# Check firewalld status
sudo firewall-cmd --list-all

# Ensure 51820/UDP is allowed
sudo ufw allow 51820/udp
# OR
sudo firewall-cmd --permanent --add-port=51820/udp && sudo firewall-cmd --reload
```

### Rollback Setup

If setup fails, the script creates backups:
- `/etc/wireguard/wg0.conf.backup.*`
- `.env.backup.*`

To restore:
```bash
sudo cp /etc/wireguard/wg0.conf.backup.<timestamp> /etc/wireguard/wg0.conf
cp .env.backup.<timestamp> .env
```

### Billing & Payments

**Submit Payment Proof (User)**
```bash
curl -X POST http://localhost:3000/api/billing/submit \
  -H "Authorization: Bearer <firebase-token>" \
  -F "amount=50000" \
  -F "plan=monthly" \
  -F "bank_from=BCA" \
  -F "transfer_date=2024-01-15" \
  -F "notes=Payment for January" \
  -F "proof=@/path/to/receipt.jpg"
```

**Check Subscription Status**
```bash
curl http://localhost:3000/api/billing/subscription \
  -H "Authorization: Bearer <firebase-token>"
```

**Approve Payment (Admin)**
```bash
curl -X POST http://localhost:3000/api/admin/billing/payments/<payment-id>/approve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"admin_note": "Payment verified"}'
```

**Reject Payment (Admin)**
```bash
curl -X POST http://localhost:3000/api/admin/billing/payments/<payment-id>/reject \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Invalid proof, amount does not match"}'
```

**Enable Billing (Admin)**
```bash
curl -X POST http://localhost:3000/api/payment-settings/toggle-billing \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"billing_enabled": true}'
```

**Add Bank Account (Admin)**
```bash
curl -X POST http://localhost:3000/api/payment-settings/banks \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bank": "BCA",
    "account_number": "1234567890",
    "account_name": "PT VPN Access",
    "description": "Transfer ke rekening ini",
    "order": 1
  }'
```

**Update Payment Settings (Admin)**
```bash
curl -X PATCH http://localhost:3000/api/payment-settings/settings \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "billing_enabled": true,
    "min_amount": 10000,
    "max_amount": 1000000,
    "auto_approve": false
  }'
```

**Check Billing Status (Public)**
```bash
curl http://localhost:3000/api/payment-settings/status
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/billing/submit` | 5 requests | 1 hour |
| `/api/billing/history` | 30 requests | 1 hour |
| `/api/billing/subscription` | 30 requests | 1 hour |
| `/api/admin/billing/*` | 100 requests | 1 hour |
| `/api/auth/*` | 10 requests | 15 minutes |
| `/api/vpn/generate` | 10 requests | 1 hour |
| General API | 30 requests | 1 minute |

When limit exceeded, response:
```json
{
  "error": "Too many requests",
  "message": "Too many payment submissions. Maximum 5 per hour.",
  "retryAfter": 3600
}
```

## 📧 Email Notifications

### Configuration

Add to `.env`:
```env
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=VPN Access <noreply@vpnaccess.com>
SMTP_NOTIFICATION_EMAIL=admin@vpnaccess.com
```

**For Gmail:**
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password in `SMTP_PASS`

### Email Templates

The system sends automated emails for:

| Event | Recipient | Trigger |
|-------|-----------|---------|
| Payment Submitted | Admin | User submits payment proof |
| Payment Approved | User | Admin approves payment |
| Payment Rejected | User | Admin rejects payment |
| Subscription Expiring (7 days) | User | Cron job (daily 9 AM) |
| Subscription Expiring (3 days) | User | Cron job (daily 9 AM) |
| Subscription Expiring (1 day) | User | Cron job (daily 9 AM) |
| Subscription Expired | User | Cron job (daily 10 AM) |
| Daily Summary | Admin | Cron job (daily 8 AM) |

### Cron Jobs Schedule

```javascript
// Default schedules (can be overridden via Firestore)
// Every day at 8 AM - Daily summary to admin
0 8 * * *

// Every day at 9 AM - Subscription expiry checks
0 9 * * *

// Every day at 10 AM - Expired subscription notifications
0 10 * * *
```

### Dynamic Configuration (Firestore Override) ⭐

Admin can override `.env` settings via Firestore:

**Email Settings** (`email_settings/config`):
```javascript
{
  enabled: true,
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_user: "your-email@gmail.com",
  smtp_pass: "app-password",
  smtp_from: "VPN Access <noreply@vpnaccess.com>",
  notification_email: "admin@vpnaccess.com",
  updated_at: "2024-01-15T10:00:00.000Z",
  updated_by: "admin-uid"
}
```

**Cron Settings** (`cron_settings/config`):
```javascript
{
  enabled: true,
  daily_summary_schedule: "0 8 * * *",
  expiry_check_schedule: "0 9 * * *",
  expired_check_schedule: "0 10 * * *",
  expiry_reminder_days: [7, 3, 1],
  updated_at: "2024-01-15T10:00:00.000Z",
  updated_by: "admin-uid"
}
```

**Configuration Priority:**
1. Firestore settings (if `enabled: true`)
2. `.env` settings (fallback)
3. Default values

### API Examples

**Configure Email (Admin):**
```bash
curl -X PATCH http://localhost:3000/api/admin/settings/email \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "your-email@gmail.com",
    "smtp_pass": "app-password",
    "smtp_from": "VPN Access <noreply@vpnaccess.com>",
    "notification_email": "admin@vpnaccess.com"
  }'
```

**Test Email Connection:**
```bash
curl -X POST http://localhost:3000/api/admin/settings/email/test \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'
```

**Configure Cron Schedule (Admin):**
```bash
curl -X PATCH http://localhost:3000/api/admin/settings/cron \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "daily_summary_schedule": "0 8 * * *",
    "expiry_check_schedule": "0 9 * * *",
    "expired_check_schedule": "0 10 * * *",
    "expiry_reminder_days": [7, 3, 1],
    "reload": true
  }'
```

**Trigger Cron Job Manually:**
```bash
curl -X POST http://localhost:3000/api/admin/settings/cron/trigger \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"job": "expiringCheck"}'
```

Valid jobs: `expiringCheck`, `expired`, `adminSummary`

### Disable Email Notifications

If SMTP is not configured, email notifications are automatically disabled.

## 💳 Credit Transfer System

### Overview

The credit transfer system allows users to transfer credit balance between each other with built-in **fraud detection**.

### Fraud Detection Rules

The system automatically detects and prevents fraudulent transactions:

| Check | Description | Risk Score |
|-------|-------------|------------|
| **Amount Limits** | Exceeds max transfer (1M) | +50 |
| **Daily Limit** | Exceeds daily transfer (5M) | +40 |
| **Transfer Count** | >10 transfers/day | +30 |
| **Velocity** | >3 transfers/hour | +35 |
| **Rapid Succession** | <5 min between transfers | +25 |
| **New User** | <7 days, high amount | +30 |
| **Round Amount** | 100k, 200k, 500k, 1M | +15 |
| **High Value** | >500k | +20 |
| **Self Transfer** | Same user | +10 |
| **New Recipient** | <1 day old account | +20 |
| **Circular Transfer** | A→B→A pattern | +40 |
| **Fraud History** | Previous flags | +20 each |

### Risk Levels

```
Risk Score ≥ 80  → CRITICAL → Auto-block
Risk Score 50-79 → HIGH     → Requires review
Risk Score 25-49 → MEDIUM   → Flagged for review
Risk Score < 25  → LOW      → Approved
```

### API Examples

**Get Credit Balance:**
```bash
curl http://localhost:3000/api/credit/balance \
  -H "Authorization: Bearer <token>"
```

**Transfer Credit:**
```bash
curl -X POST http://localhost:3000/api/credit/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to_user_email": "recipient@example.com",
    "amount": 50000,
    "description": "Payment for services",
    "notes": "Thanks!"
  }'
```

**Get Transaction History:**
```bash
curl "http://localhost:3000/api/credit/transactions?limit=20" \
  -H "Authorization: Bearer <token>"
```

### Admin: Add Credit to User
```bash
curl -X POST http://localhost:3000/api/admin/credit/users/:id/add \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "description": "Bonus credit",
    "notes": "Loyalty reward"
  }'
```

### Admin: Review Fraud Alert
```bash
curl -X PATCH http://localhost:3000/api/admin/credit/fraud-alerts/:id/review \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "notes": "Verified with user"
  }'
```

### Admin: Update Fraud Config
```bash
curl -X PATCH http://localhost:3000/api/admin/credit/fraud-config \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "maxTransferAmount": 2000000,
    "maxDailyTransfer": 10000000,
    "new_userDays": 14
  }'
```

## Security Notes

- 🔒 Keep `.env` file secure (never commit to git)
- 🔒 Store private keys securely
- 🔒 Use HTTPS in production
- 🔒 Restrict firewall access to necessary ports only
- 🔒 Regular security updates

## License

MIT
