# Admin Settings Panel - Complete Implementation Guide

## 📋 Overview

Admin Settings panel memungkinkan konfigurasi lengkap sistem notifikasi multi-channel (WhatsApp + Email) dan pengaturan aplikasi tanpa perlu restart server.

---

## 🎯 Features

### **Settings Categories:**

1. **WhatsApp (WAHA)**
   - Enable/disable notifications
   - WAHA API URL configuration
   - Session ID management
   - API key (optional)
   - Test phone number
   - Send test message

2. **Email (SMTP)**
   - Enable/disable notifications
   - SMTP host, port, credentials
   - SSL/TLS support
   - From email configuration
   - Send test email

3. **Billing**
   - Enable/disable billing system
   - Currency selection
   - Min/max top-up amounts
   - Auto-renewal configuration
   - Low balance alert threshold

4. **Notifications**
   - Channel preferences (WhatsApp/Email)
   - Notification type toggles:
     - Low Balance Alert
     - Expiring Soon Alert
     - Payment Approved Alert
     - Payment Rejected Alert

5. **General**
   - App name
   - App URL
   - Support email
   - Maintenance mode

---

## 🔧 Setup Guide

### **1. WAHA Setup (WhatsApp)**

```bash
# Install WAHA via Docker
docker run -d -p 9000:9000 --name waha devlikeapro/waha

# Access WAHA dashboard
# http://localhost:9000

# Start session and scan QR code
```

### **2. Gmail SMTP Setup**

1. **Enable 2FA:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Use App Password in Settings:**
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SSL/TLS: `OFF` (use STARTTLS)
   - Username: `you@gmail.com`
   - Password: `xxxx xxxx xxxx xxxx` (App Password)

---

## 🧪 Testing UI

### **Test 1: WhatsApp Settings**

1. **Navigate to Admin Panel → Settings → WhatsApp**

2. **Configure:**
   ```
   Enabled: ON
   API URL: http://localhost:9000
   Session ID: default
   Test Phone: 628123456789
   ```

3. **Click "Send Test Message"**
   - Expected: WhatsApp message received
   - Check Eruda console for response

4. **Click "Save Settings"**
   - Expected: Success notification
   - Settings persist after refresh

**Expected WhatsApp Message:**
```
🔧 *WAHA Test Message*

This is a test message from VPN Access Manager.

If you receive this, WhatsApp integration is working correctly!
```

---

### **Test 2: Email Settings**

1. **Navigate to Admin Panel → Settings → Email**

2. **Configure:**
   ```
   Enabled: ON
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SSL/TLS: OFF
   Username: you@gmail.com
   Password: [App Password]
   From Email: VPN Access <you@gmail.com>
   ```

3. **Click "Send Test Email"**
   - Expected: Email received in inbox
   - Check spam folder if not in inbox

4. **Click "Save Settings"**
   - Expected: Success notification

**Expected Email:**
```
Subject: VPN Access Test Email

This is a test email from VPN Access Manager.

If you receive this, email integration is working correctly!
```

---

### **Test 3: Billing Settings**

1. **Navigate to Admin Panel → Settings → Billing**

2. **Configure:**
   ```
   Billing Enabled: ON
   Currency: IDR
   Min Top-up: 10000
   Max Top-up: 1000000
   Auto-Renewal: ON
   Low Balance Days: 5
   ```

3. **Click "Save Settings"**
   - Expected: Success notification
   - Verify in user Payment page

---

### **Test 4: Notification Preferences**

1. **Navigate to Admin Panel → Settings → Notifications**

2. **Configure:**
   ```
   WhatsApp Enabled: ON
   Email Enabled: ON
   Low Balance Alert: ON
   Expiring Soon Alert: ON
   Payment Approved Alert: ON
   Payment Rejected Alert: ON
   ```

3. **Click "Save Settings"**
   - Expected: Success notification

---

### **Test 5: General Settings**

1. **Navigate to Admin Panel → Settings → General**

2. **Configure:**
   ```
   App Name: VPN Access Manager
   App URL: http://localhost:3001
   Support Email: support@example.com
   Maintenance Mode: OFF
   ```

3. **Click "Save Settings"**
   - Expected: Success notification

---

## 🔍 API Endpoints Testing

### **Get All Settings:**

```bash
curl http://localhost:3000/api/admin/settings \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "settings": {
    "whatsapp": {
      "enabled": true,
      "api_url": "http://localhost:9000",
      "session_id": "default"
    },
    "email": {
      "enabled": true,
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587
    },
    "billing": {
      "billing_enabled": true,
      "currency": "IDR",
      "min_topup": 10000
    },
    "notifications": {
      "whatsapp_enabled": true,
      "email_enabled": true
    },
    "general": {
      "app_name": "VPN Access Manager",
      "app_url": "http://localhost:3001"
    }
  }
}
```

---

### **Update WhatsApp Settings:**

```bash
curl -X PATCH http://localhost:3000/api/admin/settings/whatsapp \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "api_url": "http://localhost:9000",
    "session_id": "default",
    "test_phone": "628123456789"
  }'
```

---

### **Test WhatsApp:**

```bash
curl -X POST http://localhost:3000/api/admin/settings/whatsapp/test \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test_phone": "628123456789"}'
```

---

### **Test Email:**

```bash
curl -X POST http://localhost:3000/api/admin/settings/email/test \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'
```

---

## 📊 Database Structure

### **settings Collection:**

```javascript
// Document ID: 'whatsapp'
{
  enabled: true,
  api_url: 'http://localhost:9000',
  session_id: 'default',
  api_key: '',
  test_phone: '628123456789',
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'admin-uid'
}

// Document ID: 'email'
{
  enabled: true,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: 'you@gmail.com',
  smtp_pass: 'app-password',
  smtp_from: 'VPN Access <you@gmail.com>',
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'admin-uid'
}

// Document ID: 'billing'
{
  billing_enabled: true,
  currency: 'IDR',
  min_topup: 10000,
  max_topup: 1000000,
  auto_renewal_enabled: true,
  low_balance_days: 5,
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'admin-uid'
}

// Document ID: 'notifications'
{
  whatsapp_enabled: true,
  email_enabled: true,
  low_balance_alert: true,
  expiring_soon_alert: true,
  payment_approved_alert: true,
  payment_rejected_alert: true,
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'admin-uid'
}

// Document ID: 'general'
{
  app_name: 'VPN Access Manager',
  app_url: 'http://localhost:3001',
  support_email: 'support@example.com',
  maintenance_mode: false,
  updated_at: '2024-01-15T10:00:00Z',
  updated_by: 'admin-uid'
}
```

---

## 🐛 Troubleshooting

### **WhatsApp Test Fails:**

**Error:** "WAHA not properly configured"

**Solutions:**
1. Check WAHA is running: `curl http://localhost:9000/api/session`
2. Verify session is active in WAHA dashboard
3. Check API URL format (no trailing slash)
4. Verify phone number format (include country code)

---

### **Email Test Fails:**

**Error:** "SMTP connection failed"

**Solutions:**
1. Verify SMTP credentials
2. For Gmail: Use App Password, not main password
3. Check SMTP port (587 for TLS, 465 for SSL)
4. Disable SSL/TLS for Gmail port 587
5. Check firewall settings

---

### **Settings Not Saving:**

**Error:** Settings revert after save

**Solutions:**
1. Verify admin role in Firestore
2. Check Firestore security rules
3. Inspect browser console for errors
4. Verify API response status (should be 200)

---

## ✅ Verification Checklist

### **WhatsApp:**
- [ ] WAHA running on port 9000
- [ ] Session active in WAHA dashboard
- [ ] API URL configured correctly
- [ ] Test message received
- [ ] Settings persist after refresh

### **Email:**
- [ ] SMTP credentials valid
- [ ] App Password used (for Gmail)
- [ ] Test email received
- [ ] Settings persist after refresh

### **Billing:**
- [ ] Billing enabled/disabled works
- [ ] Min/max amounts validated
- [ ] Auto-renewal toggle works
- [ ] Settings persist after refresh

### **Notifications:**
- [ ] All toggles functional
- [ ] Channel preferences saved
- [ ] Settings persist after refresh

### **General:**
- [ ] App name updated
- [ ] App URL configured
- [ ] Support email saved
- [ ] Maintenance mode toggle works

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `frontend/lib/api.js` | ✅ Added `getCategory()` method |
| `frontend/components/AdminSettings.js` | ✅ Complete rewrite with all categories |
| `backend/routes/settings.js` | ✅ Already has all endpoints |

---

## 🎯 Next Steps

1. **Test all settings categories**
2. **Verify test buttons work**
3. **Check settings persist in Firestore**
4. **Test notification delivery**
5. **Verify auto-renewal uses settings**

---

**Status:** ✅ COMPLETE - Admin Settings Panel fully implemented
**Last Updated:** 2026-03-07
