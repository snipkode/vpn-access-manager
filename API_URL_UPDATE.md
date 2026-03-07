# API URL Update - Production Server

## 📋 Overview

Frontend API URL telah diupdate dari localhost ke production server:

**Before:** `http://localhost:3000/api`  
**After:** `http://solusikonsep.co.id:4000/api`

---

## 🔧 Files Modified

### **1. frontend/lib/api.js**

```javascript
// Before
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// After
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://solusikonsep.co.id:4000/api';
```

---

### **2. frontend/.env.local.example**

```bash
# Before
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# After
NEXT_PUBLIC_API_URL=http://solusikonsep.co.id:4000/api
```

---

## 🚀 Deployment Steps

### **Option 1: Using .env.local (Recommended)**

1. **Create .env.local file:**
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

2. **Edit .env.local:**
   ```bash
   NEXT_PUBLIC_API_URL=http://solusikonsep.co.id:4000/api
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

### **Option 2: Default Fallback**

If no .env.local file exists, the code will use the default:
```javascript
'http://solusikonsep.co.id:4000/api'
```

---

## 🧪 Testing

### **Test API Connection:**

```bash
# Test public endpoint
curl http://solusikonsep.co.id:4000/api/payment-settings/config

# Expected response:
{
  "billing_enabled": true,
  "can_submit_payment": true,
  ...
}
```

### **Test Frontend:**

1. Open browser: `http://localhost:3001` (or your frontend URL)
2. Open DevTools → Network tab
3. Login
4. Check API calls go to `http://solusikonsep.co.id:4000/api/*`

---

## 📊 API Endpoints

All API calls will now go to production server:

| Endpoint | URL |
|----------|-----|
| Auth | `http://solusikonsep.co.id:4000/api/auth/*` |
| VPN | `http://solusikonsep.co.id:4000/api/vpn/*` |
| Billing | `http://solusikonsep.co.id:4000/api/billing/*` |
| Credit | `http://solusikonsep.co.id:4000/api/credit/*` |
| Admin | `http://solusikonsep.co.id:4000/api/admin/*` |
| Settings | `http://solusikonsep.co.id:4000/api/admin/settings/*` |

---

## ⚠️ Important Notes

### **CORS Configuration:**

Make sure backend server has CORS enabled for frontend domain:

```javascript
// Backend server.js
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
```

---

### **Firebase Configuration:**

Ensure Firebase is configured correctly in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase configs
```

---

## 🐛 Troubleshooting

### **Issue: API calls fail**

**Check:**
1. Backend server is running on port 4000
2. Server is accessible: `curl http://solusikonsep.co.id:4000/health`
3. Firewall allows port 4000
4. CORS is configured properly

---

### **Issue: Frontend still uses localhost**

**Solutions:**
1. Delete `.next` folder: `rm -rf .next`
2. Restart dev server: `npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`
4. Check browser DevTools → Network tab

---

### **Issue: .env.local not working**

**Check:**
1. File is named `.env.local` (not `.env.local.example`)
2. File is in `frontend/` directory
3. Restart dev server after creating file
4. Check Next.js docs: environment variables are loaded at build time

---

## 📝 Environment Variables

### **Required:**

```bash
# API URL
NEXT_PUBLIC_API_URL=http://solusikonsep.co.id:4000/api

# Firebase (get from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### **Optional:**

```bash
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## ✅ Verification Checklist

- [x] API URL updated in `lib/api.js`
- [x] API URL updated in `.env.local.example`
- [ ] Create `.env.local` with production URL
- [ ] Test API connection
- [ ] Test frontend login
- [ ] Test API calls in DevTools
- [ ] Verify CORS configuration
- [ ] Test all major features (Payment, VPN, Wallet)

---

## 🔄 Revert to Localhost

If you need to revert to localhost for development:

```bash
# In .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Or in lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
```

---

**Status:** ✅ COMPLETE - API URL updated to production server  
**Last Updated:** 2026-03-07  
**Production Server:** http://solusikonsep.co.id:4000
