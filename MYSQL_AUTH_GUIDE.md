# 🔐 Full MySQL Authentication - No Firebase

## ✅ Firebase Completely Removed

Your system is now **100% MySQL-based** dengan email/password authentication!

---

## 🚀 Quick Start

### 1. Backend Already Running
```bash
pm2 logs backdev
# Should show: "MySQL mode - Firebase not initialized"
```

### 2. Test Login
**URL:** http://localhost:3000/login

**Admin Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

---

## 📋 Login Flow

### Frontend (Email + Password)
```
1. User enters email & password
2. POST to /api/auth/login
3. Backend verifies credentials
4. Returns JWT token
5. Token stored in localStorage
6. Redirect to dashboard
```

### Backend (JWT Auth)
```javascript
// Login endpoint
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "Admin123!"
}

// Response
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

---

## 🔑 Admin Account

### Default Admin
- **Email:** admin@example.com
- **Password:** Admin123!
- **Role:** admin
- **VPN Enabled:** true

### Create New Admin
```bash
cd /root/vpn/backend
npm run create:admin

# Interactive prompt:
# Admin email: newadmin@example.com
# Admin password: SecurePassword123!
# Admin name: New Admin
```

---

## 🎯 API Endpoints

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### Get Current User
```bash
TOKEN="your-jwt-token-here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/me
```

### Change Password
```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"Admin123!","newPassword":"NewPassword456!"}'
```

### Register New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"userpass123","name":"John Doe"}'
```

---

## 🔐 Security Features

### Password Hashing
- **Algorithm:** bcrypt
- **Salt Rounds:** 10
- **Storage:** Hashed only (never plain text)

### JWT Token
- **Algorithm:** HS256
- **Expiry:** 7 days
- **Payload:** id, email, role

### Middleware Protection
```javascript
// Protected route example
router.get('/admin/stats', authMiddleware, adminMiddleware, handler);
```

---

## 📁 Files Changed

### Removed
```
❌ firebase-admin (npm package)
❌ Firebase config dependencies
❌ Google Sign-In in frontend
```

### Modified
```
✏️ frontend/pages/login.js - Email/password form
✏️ backend/config/firebase.js - Stub (not used)
✏️ backend/middleware/validateEnv.js - Removed Firebase requirements
✏️ backend/models/User.js - Added password field
✏️ backend/server.js - Use MySQL auth routes
```

### Created
```
✅ backend/services/auth-mysql.js - JWT auth service
✅ backend/routes/auth-mysql.js - Auth endpoints
✅ backend/scripts/create-admin.js - Admin creation CLI
✅ backend/migrations/20260311000002-add-password-column.js
```

---

## 🎨 Frontend Login Page

### Features
- Email + Password form
- Show/hide password toggle
- Forgot password link (placeholder)
- Sign up link
- Responsive design
- Gradient background
- Loading states

### Code Example
```javascript
// Login handler
const handleLogin = async (e) => {
  e.preventDefault();
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  // Redirect
  router.push('/');
};
```

---

## 🗄️ Database Schema

### Users Table - New Columns

| Column | Type | Description |
|--------|------|-------------|
| `password` | VARCHAR(255) | Hashed password (bcrypt) |
| `last_login` | DATETIME | Last login timestamp |

**Note:** Password is nullable for future OAuth integration

---

## 🔄 Migration from Firebase

### Option 1: Fresh Start (Recommended)
1. ✅ Done! You're using this
2. Create admin with CLI
3. Create users via API or admin panel

### Option 2: Import Existing Users
```sql
-- Import users from Firebase export
INSERT INTO users (id, email, password, name, role)
SELECT 
  uid,
  email,
  NULL, -- Password null for OAuth users
  display_name,
  CASE WHEN customClaims.admin = true THEN 'admin' ELSE 'user' END
FROM firebase_users_export;
```

Then users reset password via forgot password flow.

---

## 🧪 Testing

### Test Login
```bash
# Should return token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### Test Protected Route
```bash
# Use token from login response
TOKEN="eyJhbGci..."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/stats
```

### Test Invalid Credentials
```bash
# Should return 401
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"wrongpassword"}'
```

---

## ⚠️ Important Notes

### Password Requirements
Enforce in frontend:
```javascript
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true
};
```

### Token Expiry
- Tokens expire after 7 days
- Auto-logout when expired
- User must login again

### Forgot Password
Coming soon:
- Email with reset token
- Token expiry (1 hour)
- Reset password endpoint

---

## 🎉 Summary

| Feature | Before (Firebase) | After (MySQL) |
|---------|------------------|---------------|
| Auth Provider | Firebase | MySQL + JWT ✅ |
| Login Method | Google OAuth | Email/Password ✅ |
| Password Hash | Firebase | bcrypt ✅ |
| Token | Firebase JWT | Custom JWT ✅ |
| User Data | Firestore | MySQL ✅ |
| Cost | $ | Free ✅ |
| Control | Limited | Full ✅ |
| Dependencies | firebase-admin | bcrypt, jsonwebtoken ✅ |

**Your system is now 100% MySQL-based with email/password authentication!** 🚀

---

## 📞 Troubleshooting

### Login fails with "Invalid credentials"
```bash
# Check admin exists
mysql -u vpn_user -pvpnpassword123 vpn_access -e "SELECT id, email, role FROM users WHERE email = 'admin@example.com';"
```

### Token expired
```bash
# Login again to get new token
# Or increase JWT_EXPIRES_IN in auth-mysql.js
```

### Cannot access admin routes
```bash
# Check user role
mysql> SELECT role FROM users WHERE email = 'admin@example.com';
# Should return 'admin'
```

### Frontend can't connect to backend
```bash
# Check API URL in frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:5000
```
