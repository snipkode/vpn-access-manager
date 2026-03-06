# WAHA Integration & Admin Settings Panel

## Overview
Sistem notifikasi multi-channel (WhatsApp + Email) dengan konfigurasi lengkap via Admin Panel. Semua settings dapat diubah via database tanpa perlu restart server.

---

## 📱 WAHA (WhatsApp HTTP API) Integration

### What is WAHA?
WAHA (WhatsApp HTTP API) adalah gateway untuk mengirim pesan WhatsApp secara programmatic. WAHA mensimulasikan WhatsApp Web dan memungkinkan pengiriman pesan via API.

### Setup WAHA

#### Option 1: Docker (Recommended)
```bash
# Pull image
docker pull devlikeapro/waha

# Run WAHA
docker run -d -p 9000:9000 --name waha devlikeapro/waha

# Access WAHA dashboard
# http://localhost:9000
```

#### Option 2: Docker Compose
```yaml
# docker-compose.yml
version: '3'
services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    ports:
      - "9000:9000"
    volumes:
      - waha_sessions:/app/sessions
    restart: unless-stopped

volumes:
  waha_sessions:
```

### Configure WAHA

1. **Start Session**
   - Buka http://localhost:9000
   - Klik "Start Session"
   - Scan QR code dengan WhatsApp mobile
   - Session ID default: `default`

2. **Get Session Info**
   ```bash
   curl http://localhost:9000/api/session
   ```

3. **Test Send Message**
   ```bash
   curl -X POST http://localhost:9000/api/sendText \
     -H "Content-Type: application/json" \
     -d '{
       "chatId": "628123456789@c.us",
       "body": "Hello from WAHA!"
     }'
   ```

---

## 🔧 Admin Settings Panel

### Access Admin Settings
1. Login sebagai admin
2. Navigate to: **Admin Panel > Settings**
3. Configure:
   - WhatsApp (WAHA)
   - Email (SMTP)
   - Billing
   - Notifications
   - General

### Settings Categories

#### 1. WhatsApp Settings
| Field | Description | Example |
|-------|-------------|---------|
| Enabled | Enable/disable WhatsApp notifications | ✓ / ✗ |
| API URL | WAHA API endpoint | `http://localhost:9000` |
| Session ID | WAHA session identifier | `default` |
| API Key | Optional API key (if configured) | - |
| Test Phone | Phone number for testing | `628123456789` |

**Test Button:** Send test WhatsApp message to test phone

#### 2. Email Settings
| Field | Description | Example |
|-------|-------------|---------|
| Enabled | Enable/disable email notifications | ✓ / ✗ |
| SMTP Host | SMTP server hostname | `smtp.gmail.com` |
| SMTP Port | SMTP port | `587` |
| SSL/TLS | Use secure connection | ✓ / ✗ |
| Username | SMTP username (email) | `you@gmail.com` |
| Password | SMTP password / App Password | `xxxx xxxx xxxx` |
| From Email | Sender email | `VPN Manager <you@gmail.com>` |

**Gmail Setup:**
1. Enable 2FA: https://myaccount.google.com/security
2. Create App Password: https://myaccount.google.com/apppasswords
3. Use App Password for SMTP Password

**Test Button:** Send test email to SMTP username

#### 3. Billing Settings
| Field | Description | Default |
|-------|-------------|---------|
| Billing Enabled | Enable billing system | ✓ |
| Currency | Currency code | `IDR` |
| Min Top-up | Minimum top-up amount | `10000` |
| Max Top-up | Maximum top-up amount | `1000000` |
| Auto-Renewal Enabled | Enable auto-renewal system | ✓ |
| Low Balance Days | Alert threshold (days before expiry) | `5` |

#### 4. Notification Preferences
| Notification Type | Description |
|-------------------|-------------|
| WhatsApp Enabled | Send notifications via WhatsApp |
| Email Enabled | Send notifications via Email |
| Low Balance Alert | Alert when balance < plan price |
| Expiring Soon Alert | Alert X days before expiry |
| Payment Approved Alert | Notify when payment approved |
| Payment Rejected Alert | Notify when payment rejected |

#### 5. General Settings
| Field | Description | Example |
|-------|-------------|---------|
| App Name | Application name | `VPN Access Manager` |
| App URL | Frontend URL (for links) | `http://localhost:3001` |
| Support Email | Support contact email | `support@example.com` |
| Maintenance Mode | Show maintenance page | ✗ |

---

## 📬 Notification System

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│ Event Trigger (e.g., Low Balance)                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ Get Notification Preferences   │
         │ from Database                  │
         └────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │ WhatsApp        │     │ Email           │
    │ Enabled?        │     │ Enabled?        │
    └─────────────────┘     └─────────────────┘
         │                       │
        YES                     YES
         │                       │
         ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │ Get User's      │     │ Get Email       │
    │ WhatsApp Number │     │ Address         │
    └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │ Send via WAHA   │     │ Send via SMTP   │
    └─────────────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌────────────────────────────────┐
         │ Log Notification to Database   │
         └────────────────────────────────┘
```

### Notification Channels

**WhatsApp (Primary):**
- Higher open rate (~98%)
- Instant delivery
- Rich formatting (bold, italic, etc.)
- Interactive buttons (WAHA Premium)

**Email (Secondary):**
- Detailed HTML templates
- Better for receipts/invoices
- Longer content
- Professional appearance

### Notification Types

#### 1. Low Balance Alert
**Trigger:** Balance < Plan Price AND Subscription ending in ≤ X days

**WhatsApp Template:**
```
⚠️ *LOW BALANCE ALERT*

VPN Access Manager

━━━━━━━━━━━━━━━━━━━━

Your credit balance is insufficient for auto-renewal.

💰 *Balance Breakdown:*
• Current Balance: Rp 30,000
• Required (Monthly): Rp 50,000
• Deficit: Rp 20,000

📅 *Subscription:*
• Expires: 15 Januari 2024
• Days Remaining: 2 days

━━━━━━━━━━━━━━━━━━━━

Please top-up to avoid service interruption.
```

**Email:** HTML template with gradient design, balance table, and CTA button

#### 2. Expiring Soon Alert
**Trigger:** Subscription expiring in 7, 3, 1 days

#### 3. Payment Approved
**Trigger:** Admin approves payment

**WhatsApp Template:**
```
✅ *PAYMENT APPROVED*

VPN Access Manager

━━━━━━━━━━━━━━━━━━━━

Your payment has been approved!

💰 *Payment Details:*
• Amount: Rp 50,000
• Plan: Monthly
• Duration: 30 days

📅 *New Expiry:* 15 Februari 2024

━━━━━━━━━━━━━━━━━━━━

Thank you for your payment!
```

#### 4. Payment Rejected
**Trigger:** Admin rejects payment

---

## 🗄️ Database Collections

### settings
```javascript
// Document ID: 'whatsapp'
{
  enabled: true,
  api_url: 'http://localhost:9000',
  session_id: 'default',
  api_key: '',
  test_phone: '628123456789',
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'admin-uid',
}

// Document ID: 'email'
{
  enabled: true,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: 'you@gmail.com',
  smtp_pass: 'app-password',
  smtp_from: 'VPN Manager <you@gmail.com>',
}

// Document ID: 'billing'
{
  billing_enabled: true,
  currency: 'IDR',
  min_topup: 10000,
  max_topup: 1000000,
  auto_renewal_enabled: true,
  low_balance_days: 5,
}

// Document ID: 'notifications'
{
  whatsapp_enabled: true,
  email_enabled: true,
  low_balance_alert: true,
  expiring_soon_alert: true,
  payment_approved_alert: true,
  payment_rejected_alert: true,
}

// Document ID: 'general'
{
  app_name: 'VPN Access Manager',
  app_url: 'http://localhost:3001',
  support_email: 'support@example.com',
  maintenance_mode: false,
}
```

### users
```javascript
{
  email: 'user@example.com',
  whatsapp: '628123456789', // Add this field
  phone: '628123456789',
  credit_balance: 100000,
  auto_renewal_enabled: true,
  // ... other fields
}
```

### notifications (Logs)
```javascript
{
  user_id: 'user-uid',
  type: 'low_balance_alert',
  status: 'sent',
  channels: {
    whatsapp: true,
    email: true,
  },
  sent_count: 2,
  data: {
    current_balance: 30000,
    required_amount: 50000,
    deficit: 20000,
    days_until_expiry: 2,
  },
  created_at: '2024-01-15T10:00:00Z',
}
```

---

## 🔌 API Endpoints

### Settings Management

#### Get All Settings
```http
GET /api/admin/settings
Authorization: Bearer <admin-token>

Response:
{
  "settings": {
    "whatsapp": { ... },
    "email": { ... },
    "billing": { ... },
    "notifications": { ... },
    "general": { ... }
  }
}
```

#### Update Settings
```http
PATCH /api/admin/settings/:category
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "enabled": true,
  "api_url": "http://localhost:9000"
}
```

#### Test WhatsApp
```http
POST /api/admin/settings/whatsapp/test
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "test_phone": "628123456789"
}
```

#### Test Email
```http
POST /api/admin/settings/email/test
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "to": "test@example.com"
}
```

---

## 🚀 Quick Start Guide

### 1. Setup WAHA
```bash
# Install via Docker
docker run -d -p 9000:9000 --name waha devlikeapro/waha

# Access dashboard
# http://localhost:9000
# Start session and scan QR
```

### 2. Configure Settings
1. Login as admin
2. Go to **Admin Panel > Settings**
3. **WhatsApp Tab:**
   - Enable: ✓
   - API URL: `http://localhost:9000`
   - Session ID: `default`
   - Test Phone: `628123456789`
   - Click **Save Settings**
   - Click **Send Test Message**

4. **Email Tab:**
   - Enable: ✓
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SSL/TLS: ✗
   - Username: `you@gmail.com`
   - Password: `your-app-password`
   - Click **Save Settings**
   - Click **Send Test Email**

5. **Notifications Tab:**
   - Enable all notification types: ✓
   - Click **Save Settings**

### 3. Add WhatsApp to Users
```javascript
// Firestore Console
// users > [select user] > Add field
whatsapp: "628123456789"
```

### 4. Test Low Balance Alert
```bash
# Run auto-renewal script manually
cd backend
node scripts/auto-renewal.js

# Check notifications collection for logs
```

---

## 🔐 Security Notes

1. **API Keys:** Store WAHA API keys in database (encrypted at rest)
2. **SMTP Passwords:** Use App Passwords, not main password
3. **Admin Access:** All settings endpoints require admin role
4. **Audit Logs:** All setting changes logged with `updated_by` and `updated_at`
5. **Phone Numbers:** Format consistently with country code

---

## 🐛 Troubleshooting

### WhatsApp Not Sending

**Problem:** Messages not sent via WAHA

**Solutions:**
1. Check WAHA is running: `curl http://localhost:9000/api/session`
2. Verify session is active in WAHA dashboard
3. Check phone number format (must include country code)
4. Verify API URL in settings
5. Check firewall/port 9000

### Email Not Sending

**Problem:** SMTP errors

**Solutions:**
1. Verify SMTP credentials
2. For Gmail: Use App Password, not main password
3. Check SMTP port (587 for TLS, 465 for SSL)
4. Test connection: `telnet smtp.gmail.com 587`
5. Check spam folder

### Settings Not Saving

**Problem:** Settings revert after save

**Solutions:**
1. Verify admin role in Firebase
2. Check Firestore security rules
3. Inspect browser console for errors
4. Verify API response status

---

## 📊 Monitoring

### Check Notification Logs
```javascript
// Firestore Console
// notifications collection
// Filter by type: 'low_balance_alert'
// Filter by status: 'sent' or 'failed'
```

### WAHA Logs
```bash
# Docker logs
docker logs waha

# Or access via dashboard
# http://localhost:9000/logs
```

### Email Delivery
- Check SMTP server logs
- Monitor bounce/complaint rates
- Use dedicated email service for production (SendGrid, SES)

---

## 🎯 Best Practices

1. **WhatsApp:**
   - Use for urgent/important notifications
   - Keep messages concise
   - Include clear call-to-action
   - Respect quiet hours (no notifications 9PM-7AM)

2. **Email:**
   - Use for detailed information
   - Include branding
   - Mobile-responsive templates
   - Unsubscribe option

3. **Settings:**
   - Document all changes
   - Test after each change
   - Backup settings periodically
   - Use staging environment first

4. **Performance:**
   - Settings cached for 5 minutes
   - Async notification sending
   - Timeout after 10 seconds
   - Retry failed notifications (future enhancement)

---

## 📖 References

- WAHA Documentation: https://waha.devlikeapro.com/
- WAHA GitHub: https://github.com/devlikeapro/waha
- Nodemailer: https://nodemailer.com/
- Firebase Firestore: https://firebase.google.com/docs/firestore
