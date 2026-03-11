# 🔐 Full MySQL Migration - Authentication Included

## ✅ Complete Migration from Firebase

Your system is now **100% MySQL-based**:
- ✅ Authentication (JWT with bcrypt)
- ✅ User management
- ✅ Device management
- ✅ Firewall rules
- ✅ Access logs
- ✅ Payments
- ✅ Dashboard statistics

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd /root/vpn/backend
npm install
```

### 2. Run Migrations
```bash
# Add password column to users table
node migrations/20260311000002-add-password-column.js

# Or use npm script
npm run db:migrate
```

### 3. Create Admin User
```bash
npm run create:admin

# Enter:
# - Admin email: admin@example.com
# - Admin password: (your password)
# - Admin name: Admin
```

### 4. Update Backend Config
```bash
# Edit .env - REMOVE Firebase credentials
nano /root/vpn/backend/.env

# Set JWT secret
JWT_SECRET=your-super-secret-key-change-this-in-production

# Ensure MySQL is enabled
DB_ENABLED=true
```

### 5. Start Backend
```bash
# Development
npm run dev

# Production
pm2 restart backdev
```

---

## 🔑 API Endpoints

### Register User
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

# Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "User registered successfully"
}
```

### Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "yourpassword"
}

# Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### Get Current User
```bash
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

### Change Password
```bash
POST http://localhost:5000/api/auth/change-password
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "oldPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 📊 Database Schema Updates

### Users Table - New Columns

| Column | Type | Description |
|--------|------|-------------|
| `password` | VARCHAR(255) | Hashed password (bcrypt) |
| `last_login` | DATETIME | Last login timestamp |

**Note:** Password is nullable for future OAuth integration (Google, GitHub, etc.)

---

## 🔐 Security Features

### Password Hashing
- **Algorithm:** bcrypt
- **Salt rounds:** 10
- **Storage:** Hashed only (never store plain text)

### JWT Token
- **Algorithm:** HS256
- **Expiry:** 7 days
- **Payload:** id, email, role

### Middleware Protection
```javascript
// Protected route
app.use('/api/admin', authMiddleware, adminMiddleware);

// Public route
app.use('/api/auth/login', publicRoute);
```

---

## 🎯 Frontend Integration

### Update Login Component

```javascript
// OLD - Firebase
import { signInWithEmailAndPassword } from 'firebase/auth';
await signInWithEmailAndPassword(auth, email, password);

// NEW - MySQL API
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

### Update Auth Header

```javascript
// Include token in all API requests
const token = localStorage.getItem('token');

fetch('http://localhost:5000/api/admin/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Logout

```javascript
// Clear local storage
localStorage.removeItem('token');
localStorage.removeItem('user');
window.location.href = '/login';
```

---

## 📝 Create Admin Account

### Method 1: CLI Script
```bash
npm run create:admin

# Interactive prompt:
# Admin email: admin@example.com
# Admin password: SecurePassword123!
# Admin name: Administrator
```

### Method 2: SQL Direct
```sql
INSERT INTO users (id, email, password, name, role, vpn_enabled, subscription_status, created_at, updated_at)
VALUES (
  'admin-001',
  'admin@example.com',
  '$2b$10$...',  -- Use bcrypt to hash password
  'Administrator',
  'admin',
  true,
  'active',
  NOW(),
  NOW()
);
```

### Method 3: API (After First Admin Created)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@example.com",
    "password": "SecurePassword123!",
    "name": "Admin 2"
  }'

# Then manually update role in database:
mysql> UPDATE users SET role = 'admin' WHERE email = 'admin2@example.com';
```

---

## 🔄 Migration from Firebase Auth

### Option 1: Fresh Start (Recommended)
1. Create new admin user with CLI
2. Keep existing users in Firestore
3. Users reset password on next login
4. Gradually migrate to MySQL

### Option 2: Export/Import
1. Export users from Firebase
2. Hash passwords (if not already hashed)
3. Import to MySQL users table
4. Update frontend to use MySQL auth

### Option 3: Hybrid (Temporary)
1. Keep Firebase Auth for existing users
2. Use MySQL Auth for new users
3. Migrate gradually
4. Switch completely when ready

---

## 🛡️ Security Best Practices

### 1. JWT Secret
```bash
# Generate strong secret
openssl rand -base64 32

# Update .env
JWT_SECRET="your-generated-secret-here"
```

### 2. Password Requirements
```javascript
// Enforce in frontend
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
};
```

### 3. Rate Limiting
```javascript
// Already configured in server.js
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
```

### 4. HTTPS in Production
```bash
# Never send passwords over HTTP in production
# Use reverse proxy (Nginx) with SSL
```

---

## 🧪 Testing

### Test Login
```bash
# Register test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Protected Route
```bash
# Get token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Access protected route
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/me
```

### Test Admin Route
```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"adminpass"}'

# Access admin route
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/stats
```

---

## 📁 Files Changed/Created

### New Files
```
backend/
├── services/
│   └── auth-mysql.js          # JWT auth service
├── routes/
│   └── auth-mysql.js          # Auth endpoints
├── scripts/
│   └── create-admin.js        # Admin creation script
└── migrations/
    └── 20260311000002-add-password-column.js
```

### Modified Files
```
backend/
├── models/User.js             # Added password, last_login
├── server.js                  # Use MySQL auth routes
└── package.json               # Added bcrypt, jsonwebtoken
```

---

## ⚠️ Important Notes

### 1. Firebase Can Be Removed
After testing MySQL auth:
```bash
# Remove Firebase dependency (optional)
npm uninstall firebase-admin

# Remove Firebase config from .env
# FIREBASE_PROJECT_ID=...
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_PRIVATE_KEY=...
```

### 2. Password Reset
For password reset, implement:
- Email with reset token
- Token expiry (1 hour)
- Reset password endpoint

### 3. OAuth Integration (Future)
To add Google OAuth back:
```javascript
// Keep password NULL for OAuth users
// Add oauth_provider, oauth_id columns
// Create /api/auth/google endpoint
```

---

## 🎉 Summary

| Feature | Before (Firebase) | After (MySQL) |
|---------|------------------|---------------|
| Auth Provider | Firebase | MySQL + JWT ✅ |
| Password Hash | Firebase | bcrypt ✅ |
| Token | Firebase JWT | Custom JWT ✅ |
| User Data | Firestore | MySQL ✅ |
| Login Flow | Firebase SDK | API Call ✅ |
| Cost | $ | Free ✅ |
| Control | Limited | Full ✅ |

**Your system is now 100% MySQL-based!** 🚀

---

## 📞 Troubleshooting

### Error: Invalid password
```bash
# Make sure password is hashed before storing
# Use hashPassword() from auth-mysql.js
```

### Error: Token expired
```bash
# Token expires after 7 days
# Login again to get new token
# Or increase JWT_EXPIRES_IN in auth-mysql.js
```

### Error: Cannot find module 'bcrypt'
```bash
# Install dependencies
npm install
```

### Admin cannot login
```bash
# Check password hash in database
mysql> SELECT id, email, role FROM users WHERE email = 'admin@example.com';

# Recreate admin if needed
npm run create:admin
```
