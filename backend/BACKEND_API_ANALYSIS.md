# Backend API Analysis

## 📊 Overview

**VPN Access Backend API** adalah RESTful API yang mengelola VPN subscription, billing, credit system, referral program, dan user management.

### Tech Stack
- **Framework**: Express.js (ES Modules)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (JWT Bearer Token)
- **VPN**: WireGuard
- **Documentation**: Swagger/OpenAPI 3.0
- **File Upload**: Multer
- **Rate Limiting**: express-rate-limit

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Frontend │  │  Mobile  │  │   CLI    │  │  Admin   │   │
│  │  (Next)  │  │   (iOS)  │  │  Client  │  │  Panel   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │ Bearer Token (JWT)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js Server (Port 5000)                        │  │
│  │  - CORS                                                │  │
│  │  - Security Headers (Helmet)                           │  │
│  │  - Rate Limiting                                       │  │
│  │  - Input Sanitization                                  │  │
│  │  - Audit Logging                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    ROUTE LAYER                               │
│  ┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌────────────┐ │
│  │  Auth  │ │ VPN  │ │ Billing│ │ Credit │ │   Admin    │ │
│  │ Routes │ │Routes│ │ Routes │ │ Routes │ │   Routes   │ │
│  └────────┘ └──────┘ └────────┘ └────────┘ └────────────┘ │
│  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐ │
│  │ User   │ │ Payment  │ │ Settings│ │ Referral Routes  │ │
│  │ Routes │ │ Settings │ │ Routes  │ │ (User + Admin)   │ │
│  └────────┘ └──────────┘ └─────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                               │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ WireGuard│ │ Credit  │ │ Referral │ │ Email/SMS      │  │
│  │ Service  │ │ Service │ │ Service  │ │ Notification   │  │
│  └──────────┘ └─────────┘ └──────────┘ └────────────────┘  │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Backup  │ │  Cron   │ │ File     │ │ Cloud Storage  │  │
│  │ Service  │ │  Jobs   │ │ Cleanup  │ │ (S3 Compatible)│  │
│  └──────────┘ └─────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Firebase Firestore (NoSQL)                           │  │
│  │  - 25 Collections                                     │  │
│  │  - Real-time sync                                     │  │
│  │  - Automatic scaling                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WireGuard VPN Server                                 │  │
│  │  - wg0 interface                                      │  │
│  │  - IP allocation (10.0.0.0/24)                        │  │
│  │  - Peer management                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### 1. **Authentication**
- Firebase JWT Bearer Token
- Token expiration handling (1 hour)
- Automatic token refresh on frontend
- Role-based access control (user/admin)

### 2. **Middleware Security**
```javascript
// Security headers (Helmet)
- X-DNS-Prefetch-Control
- X-Frame-Options (SAMEORIGIN)
- Strict-Transport-Security
- X-Content-Type-Options
- X-XSS-Protection
- Content-Security-Policy

// Input sanitization
- express-mongo-sanitize (prevent NoSQL injection)
- xss-clean (prevent XSS attacks)
- hpp (prevent parameter pollution)

// Rate limiting
- General: 30 req/min (production)
- Billing submit: 5 req/hour
- Credit transfer: 10 req/hour
- Admin actions: 500 req/hour

// Audit logging
- All requests logged
- User action tracking
- IP address logging
```

### 3. **File Upload Security**
- File type validation (JPEG, PNG, PDF only)
- File size limit (5MB max)
- Secure filename generation
- Stored outside web root

---

## 📡 API Endpoints

### **Base URL**: `http://localhost:5000/api`

### 1. **Auth Routes** (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/verify` | Verify Firebase token | ❌ |
| GET | `/me` | Get current user info | ✅ |
| POST | `/login` | Login with Firebase token | ❌ |
| POST | `/logout` | Logout | ✅ |

### 2. **VPN Routes** (`/api/vpn`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/devices` | Get user's VPN devices | ✅ |
| POST | `/generate` | Generate new VPN config | ✅ |
| GET | `/device/:id` | Get device details | ✅ |
| DELETE | `/device/:id` | Delete device | ✅ |
| POST | `/device/:id/disable` | Disable device (admin) | 🔒 |
| POST | `/device/:id/reactivate` | Reactivate device (admin) | 🔒 |

**Business Logic:**
- Max 3 devices per user
- Device name max 50 chars
- IP auto-allocation from pool (10.0.0.0/24)
- Lease expiry based on subscription

### 3. **Billing Routes** (`/api/billing`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/trial` | Activate 7-day free trial | ✅ |
| GET | `/subscription` | Get user subscription | ✅ |
| GET | `/history` | Get payment history | ✅ |
| POST | `/submit` | Submit payment proof | ✅ |
| GET | `/payment/:id` | Get payment details | ✅ |
| GET | `/config` | Get billing config | ✅ |

**Payment Flow:**
```
1. User selects plan (monthly/quarterly/yearly)
2. User transfers to bank account
3. User submits payment proof (image/PDF)
4. Admin reviews payment
5. Admin approves/rejects
6. If approved → subscription activated
```

**Plans:**
- Monthly: Rp 50,000 (30 days)
- Quarterly: Rp 135,000 (90 days, 10% off)
- Yearly: Rp 480,000 (365 days, 20% off)

### 4. **Credit Routes** (`/api/credit`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/balance` | Get credit balance | ✅ |
| POST | `/sync` | Sync credit balance | ✅ |
| GET | `/transactions` | Get transaction history | ✅ |
| POST | `/transfer` | Transfer credit to user | ✅ |

**Credit System:**
- Transferable between users
- Fraud detection (velocity, amount limits)
- Admin can add/deduct credit
- Transaction audit trail

**Fraud Detection:**
```javascript
- Daily transfer limit: Rp 100,000
- Max transfers per day: 5
- Min balance requirement
- Suspicious pattern detection
```

### 5. **Referral Routes** (`/api/referral`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/code` | Get/create referral code | ✅ |
| GET | `/stats` | Get referral statistics | ✅ |
| GET | `/earnings` | Get earnings history | ✅ |
| POST | `/track` | Track referral signup | ✅ |

**Referral Tiers:**
- Bronze: 0-4 referrals (5% bonus)
- Silver: 5-9 referrals (10% bonus)
- Gold: 10-19 referrals (15% bonus)
- Platinum: 20+ referrals (20% bonus)

**Qualification:**
- Referee must activate subscription within 7 days
- Bonus calculated from first payment

### 6. **User Routes** (`/api/user`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/profile` | Get user profile | ✅ |
| PATCH | `/profile` | Update profile | ✅ |
| GET | `/preferences` | Get preferences | ✅ |
| PATCH | `/preferences` | Update preferences | ✅ |
| GET | `/notifications` | Get notifications | ✅ |
| PATCH | `/notifications/:id/read` | Mark as read | ✅ |

### 7. **Admin Routes** (`/api/admin`)

#### **Admin Users** (`/api/admin/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (filterable) |
| GET | `/users/:id` | Get user details |
| PATCH | `/users/:id` | Update user |
| PATCH | `/users/:id/role` | Update role |
| DELETE | `/users/:id` | Delete user |
| POST | `/users/:id/enable-vpn` | Enable VPN |
| POST | `/users/:id/disable-vpn` | Disable VPN |
| POST | `/users/:id/extend-subscription` | Extend subscription |

#### **Admin Billing** (`/api/admin/billing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/payments` | Get all payments |
| GET | `/billing/payments/:id` | Get payment details |
| POST | `/billing/payments/:id/approve` | Approve payment |
| POST | `/billing/payments/:id/reject` | Reject payment |
| GET | `/billing/stats` | Get statistics |
| GET | `/billing/dashboard` | Dashboard data |
| GET | `/billing/plans` | Get subscription plans |
| POST | `/billing/plans` | Save plans (bulk) |
| PATCH | `/billing/plans/:id` | Update plan |
| DELETE | `/billing/plans/:id` | Delete plan |
| GET | `/billing/bank-accounts` | Get bank accounts |
| POST | `/billing/bank-accounts` | Add bank account |
| PATCH | `/billing/bank-accounts/:id` | Update bank account |
| DELETE | `/billing/bank-accounts/:id` | Delete bank account |

#### **Admin Credit** (`/api/admin/credit`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credit/dashboard` | Credit dashboard |
| GET | `/credit/transactions` | All transactions |
| GET | `/credit/fraud-alerts` | Fraud alerts |
| PATCH | `/credit/fraud-alerts/:id/review` | Review alert |
| GET | `/credit/stats` | Credit statistics |
| POST | `/credit/users/:id/add` | Add credit |
| POST | `/credit/users/:id/deduct` | Deduct credit |

#### **Admin Referral** (`/api/admin/referral`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/referral/stats` | Overall statistics |
| GET | `/referral/users/:id` | User referral details |
| GET | `/referral/events` | All referral events |
| GET | `/referral/config` | Get referral config |
| PATCH | `/referral/config` | Update config |
| GET | `/referral/fraud/suspects` | Fraud suspects |
| PATCH | `/referral/events/:id/review` | Review event |

#### **Admin Settings** (`/api/admin/settings`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get all settings |
| GET | `/settings/:category` | Get by category |
| PATCH | `/settings/:category` | Update settings |
| POST | `/settings/whatsapp/test` | Test WhatsApp |
| POST | `/settings/email/test` | Test email |

#### **Admin Backup** (`/api/admin/backup`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/backup/dashboard` | Backup dashboard |
| POST | `/backup/trigger` | Trigger backup |
| GET | `/backup/logs` | Backup logs |
| DELETE | `/backup/logs/:id` | Delete log |
| GET | `/backup/status` | Backup status |

### 8. **Payment Settings Routes** (`/api/payment-settings`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/config` | Get billing config | ✅ |
| GET | `/settings` | Get settings (admin) | 🔒 |
| PATCH | `/settings` | Update settings (admin) | 🔒 |

### 9. **Settings Routes** (`/api/settings`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/:category` | Get settings by category | ✅ |
| PATCH | `/:category` | Update settings (admin) | 🔒 |

**Categories:**
- `billing` - Billing configuration
- `whatsapp` - WhatsApp notification settings
- `email` - Email notification settings
- `notifications` - Notification preferences
- `general` - General settings

---

## 🗄️ Database Collections

### User Management
| Collection | Description | Access |
|------------|-------------|--------|
| `users` | User profiles | Owner + Admin |
| `devices` | VPN devices | Owner + Admin |
| `user_preferences` | User settings | Owner + Admin |

### Financial
| Collection | Description | Access |
|------------|-------------|--------|
| `payments` | Payment records | Owner + Admin |
| `credit_transactions` | Credit transfers | Owner + Admin |
| `user_credits` | Credit balances | Owner + Admin |
| `topups` | Admin top-ups | Owner + Admin |

### Referral
| Collection | Description | Access |
|------------|-------------|--------|
| `referrals` | Referral codes | Owner + Admin |
| `referral_events` | Referral signups | Referrer + Admin |
| `referral_bonuses` | Bonus records | Owner + Admin |
| `referral_config` | System config | Admin only |

### System
| Collection | Description | Access |
|------------|-------------|--------|
| `fraud_alerts` | Fraud detection | Admin only |
| `fraud_config` | Fraud config | Admin only |
| `audit_logs` | Request logs | Admin only |
| `audit_logs_compact` | Compact logs | Admin only |
| `notifications` | User notifications | Owner + Admin |

### Configuration
| Collection | Description | Access |
|------------|-------------|--------|
| `payment_settings` | Billing config | Public read, Admin write |
| `bank_accounts` | Bank accounts | Public read, Admin write |
| `subscription_plans` | Subscription plans | Public read, Admin write |
| `settings` | Legacy settings | Admin only |

### Backup
| Collection | Description | Access |
|------------|-------------|--------|
| `backups` | Backup metadata | Admin only |
| `backup_logs` | Backup logs | Admin only |
| `restore_logs` | Restore logs | Admin only |
| `backup_settings` | Backup config | Admin only |
| `backup_alerts` | Backup alerts | Admin only |

---

## 🔧 Services

### 1. **WireGuard Service** (`services/wireguard.js`)
```javascript
Functions:
- generateKeypair() - Generate WireGuard keypair
- addPeer() - Add new peer to wg0 interface
- generateConfig() - Generate client config
- getNextAvailableIP() - Auto IP allocation
- disablePeer() - Revoke peer access
- reactivatePeer() - Restore peer access
- isWireGuardHealthy() - Health check
- getUsedIPsFromWireGuard() - Get allocated IPs
```

### 2. **Credit Service** (`services/credit.js`)
```javascript
Functions:
- getUserCredit() - Get user balance
- transferCredit() - Transfer between users
- detectTransferFraud() - Fraud detection
- logFraudAlert() - Log fraud alert
- getFraudConfig() - Get fraud settings
```

### 3. **Referral Service** (`services/referral.js`)
```javascript
Functions:
- getOrCreateReferralCode() - Generate code
- trackReferralSignup() - Track signup
- qualifyReferral() - Qualify for bonus
- getReferralStats() - Get statistics
- getReferralConfig() - Get config
```

### 4. **Email Service** (`services/email.js`)
```javascript
Functions:
- initializeEmailTransporter() - Setup Nodemailer
- sendEmail() - Send email
- sendPaymentNotification() - Payment status email
- sendTrialActivationEmail() - Trial confirmation
```

### 5. **WhatsApp Service** (`services/whatsapp.js`)
```javascript
Functions:
- sendWhatsAppMessage() - Send via WhatsApp API
- sendPaymentNotification() - Payment status WA
```

### 6. **Notification Service** (`services/notification.js`)
```javascript
Functions:
- createNotification() - Create in-app notification
- sendToUser() - Send to specific user
- sendToAdmins() - Broadcast to admins
```

### 7. **Backup Service** (`services/backup.js`)
```javascript
Functions:
- createBackup() - Create Firestore backup
- uploadToCloud() - Upload to S3/GCS
- restoreBackup() - Restore from backup
```

### 8. **Cron Jobs** (`services/cronJobs.js`)
```javascript
Scheduled Tasks:
- Daily subscription expiry check
- Weekly backup verification
- Monthly audit log cleanup
- Hourly referral qualification
```

### 9. **File Cleanup** (`services/fileCleanup.js`)
```javascript
Functions:
- cleanupExpiredLeases() - Remove expired VPN leases
- cleanupOldUploads() - Delete old proof images
- scheduleFileCleanup() - Daily cleanup job
```

### 10. **Cloud Storage** (`services/cloudStorage.js`)
```javascript
Functions:
- uploadFile() - Upload to S3/GCS
- downloadFile() - Download from storage
- deleteFile() - Remove from storage
```

---

## 📊 Middleware Stack

### Request Flow:
```
Request
  ↓
CORS (Cross-Origin Resource Sharing)
  ↓
express.json() - Parse JSON bodies
  ↓
express.urlencoded() - Parse URL-encoded bodies
  ↓
Security Headers (Helmet)
  ↓
Input Sanitization (mongo-sanitize, xss-clean, hpp)
  ↓
IP Blocking Check
  ↓
Request Logging
  ↓
Audit Logging
  ↓
Environment Validation
  ↓
Route-specific Rate Limiting
  ↓
Authentication Middleware (if required)
  ↓
Route Handler
  ↓
Error Handling Middleware
  ↓
Response
```

---

## 🚨 Error Handling

### Standard Error Response:
```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "details": "Additional error info (dev only)"
}
```

### HTTP Status Codes:
| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Billing disabled, etc. |

---

## 📈 Rate Limiting

### Production Limits:
| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 30 req | 1 minute |
| Billing submit | 5 req | 1 hour |
| Billing view | 300 req | 1 hour |
| Credit transfer | 10 req | 1 hour |
| Admin actions | 500 req | 1 hour |
| Admin billing view | 1000 req | 1 hour |

### Development Mode:
All endpoints: 1000 req/minute (effectively unlimited)

---

## 🔍 API Documentation

### Swagger UI:
- **URL**: `http://localhost:5000/api-docs/`
- **Spec**: `http://localhost:5000/api-docs.json`

### Health Check:
- **URL**: `http://localhost:5000/health`
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "uptime": 123.456
}
```

### API Info:
- **URL**: `http://localhost:5000/api`
- **Response**:
```json
{
  "name": "VPN Access Backend API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "vpn": "/api/vpn",
    "billing": "/api/billing",
    "credit": "/api/credit",
    "admin": "/api/admin"
  }
}
```

---

## 🔑 Authentication Flow

### 1. **Login Flow**
```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ Client  │     │ Firebase │     │ Backend │     │ Firestore│
└────┬────┘     └────┬─────┘     └────┬────┘     └────┬─────┘
     │               │                │                │
     │ 1. Sign in    │                │                │
     │──────────────>│                │                │
     │               │                │                │
     │ 2. ID Token   │                │                │
     │<──────────────│                │                │
     │               │                │                │
     │ 3. POST /api/auth/verify (token)                │
     │───────────────────────────────>│                │
     │               │                │                │
     │               │  4. Verify token               │
     │               │───────────────>│                │
     │               │                │                │
     │               │  5. Get/Create user doc        │
     │               │───────────────────────────────>│
     │               │                │                │
     │               │  6. User data                  │
     │               │<───────────────────────────────│
     │               │                │                │
     │ 7. User info + role           │                │
     │<──────────────────────────────│                │
     │               │                │                │
```

### 2. **API Request Flow**
```
Client Request
  ↓
Extract Bearer Token
  ↓
Verify Firebase JWT
  ↓
Check token expiration
  ↓
Get user from Firestore
  ↓
Check permissions (role-based)
  ↓
Execute business logic
  ↓
Return response
```

### 3. **Token Expiration Handling**
```
Token Expired (401)
  ↓
Frontend detects 'id-token-expired'
  ↓
Call currentUser.getIdToken(true)
  ↓
Get fresh token from Firebase
  ↓
Retry original request
  ↓
If retry fails → Logout user
```

---

## 📦 Environment Variables

### Required:
```bash
# Server
PORT=5000
NODE_ENV=development|production

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000

# WireGuard
WIREGUARD_PRIVATE_KEY=wg_private_key
WIREGUARD_PUBLIC_KEY=wg_public_key
WIREGUARD_DEVICE=eth0
WIREGUARD_LISTEN_PORT=51820

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# WhatsApp (optional)
WHATSAPP_API_KEY=your-api-key
WHATSAPP_API_URL=https://api.whatsapp.com

# Cloud Storage (optional)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

---

## 🚀 Deployment

### Development:
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

### Production:
```bash
cd backend
npm install
npm start
# Use PM2 or similar process manager
pm2 start server.js --name vpn-backend
```

### Docker (optional):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

---

## 🧪 Testing

### Manual Testing:
```bash
# Health check
curl http://localhost:5000/health

# Get API info
curl http://localhost:5000/api

# Test authentication (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/auth/me
```

### API Documentation Testing:
1. Open http://localhost:5000/api-docs/
2. Use Swagger UI to test endpoints
3. Requires valid Firebase token for authenticated endpoints

---

## 📝 Recommendations

### Security Improvements:
1. ✅ Implement Redis for rate limiting (currently in-memory)
2. ✅ Add request signature verification for webhooks
3. ✅ Implement API versioning (`/api/v1/...`)
4. ✅ Add request timeout handling
5. ✅ Implement circuit breaker for external services

### Performance Improvements:
1. ✅ Add Firestore query caching
2. ✅ Implement pagination for large collections
3. ✅ Add database indexes for frequently queried fields
4. ✅ Use Firestore batch operations for bulk writes
5. ✅ Implement connection pooling

### Monitoring:
1. ✅ Add structured logging (Winston/Pino)
2. ✅ Integrate with error tracking (Sentry)
3. ✅ Add performance monitoring (New Relic/DataDog)
4. ✅ Implement health check endpoints for all services
5. ✅ Add backup verification and alerting

---

## 📚 Related Documentation

- [Firestore Collections Analysis](../FIRESTORE_COLLECTIONS_ANALYSIS.md)
- [Firestore Rules & Indexes](../FIRESTORE_RULES_INDEXES_GUIDE.md)
- [Frontend API Integration](../frontend/API_INTEGRATION_GUIDE.md)
- [Referral System Guide](../REFERRAL_SYSTEM_GUIDE.md)
- [Credit System Guide](../CREDIT_SYSTEM.md)

---

**Last Updated**: March 10, 2026  
**API Version**: 1.0.0  
**Server Port**: 5000
