# Production API Configuration Update

## ✅ Updated: Frontend API to Production

### Changes Summary

Updated all frontend API references from localhost to production URL:

**Old**: `http://localhost:5000/api`  
**New**: `https://perumdati.tech:5000/api`

---

## 📝 Files Updated

### 1. **Environment Configuration**
- ✅ `/root/vpn/frontend/.env.local`
- ✅ `/root/vpn/frontend/.env.local.example`

```bash
NEXT_PUBLIC_API_URL=https://perumdati.tech:5000/api
```

### 2. **API Client**
- ✅ `/root/vpn/frontend/lib/api.js`

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://perumdati.tech:5000/api';
```

### 3. **Store API Helper**
- ✅ `/root/vpn/frontend/store/index.js`

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://perumdati.tech:5000/api';
```

### 4. **Next.js Config**
- ✅ `/root/vpn/frontend/next.config.js`

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'https://perumdati.tech:5000/api/:path*',
    },
  ];
}
```

### 5. **Components**
- ✅ `/root/vpn/frontend/components/AdminBilling.js`

```javascript
src={`${process.env.NEXT_PUBLIC_API_URL || 'https://perumdati.tech:5000/api'}${payment.proof_image_url}`}
```

### 6. **Test Page**
- ✅ `/root/vpn/frontend/public/api-test.html`

```javascript
const API_URL = 'https://perumdati.tech:5000/api';
const BACKEND_URL = 'https://perumdati.tech:5000';
```

---

## 🚀 Deployment Steps

### **Step 1: Restart Frontend**

Next.js perlu di-restart untuk membaca perubahan `.env.local`:

```bash
cd /root/vpn/frontend

# Stop current process (Ctrl+C)

# Clear cache (recommended)
rm -rf .next

# Restart
npm run dev
```

### **Step 2: Verify Configuration**

Buka browser console (F12) dan check:

```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
// Should output: https://perumdati.tech:5000/api
```

### **Step 3: Test Connection**

Buka test page:
```
http://localhost:3000/api-test.html
```

Halaman ini akan auto-test:
- ✅ Backend health check
- ✅ CORS configuration
- ✅ API endpoint response

---

## 🔧 Backend Server Requirements

### **Production Backend Must:**

1. **Run on port 5000**
   ```bash
   cd /root/vpn/backend
   npm start
   ```

2. **CORS Configuration** - Update backend to allow production frontend:

   Di `backend/server.js`:
   ```javascript
   app.use(cors({ 
     origin: [
       'http://localhost:3000',
       'https://perumdati.tech',
       'https://www.perumdati.tech'
     ], 
     credentials: true 
   }));
   ```

3. **HTTPS/SSL Certificate** - Pastikan SSL valid di `perumdati.tech:5000`

4. **Firewall** - Port 5000 harus accessible dari internet

---

## 🐛 Troubleshooting

### Issue: CORS Error

**Symptom:**
```
Access to fetch at 'https://perumdati.tech:5000/api' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Fix:**
Update backend CORS configuration:
```javascript
// backend/server.js
app.use(cors({ 
  origin: [
    'http://localhost:3000',
    'https://perumdati.tech:3000',
    'https://perumdati.tech'
  ], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Issue: SSL Certificate Error

**Symptom:**
```
ERR_SSL_VERSION_OR_CIPHER_MISMATCH
```

**Fix:**
1. Install SSL certificate (Let's Encrypt recommended)
2. Or use self-signed cert for testing (not recommended for production)

```bash
# Let's Encrypt
sudo certbot certonly --standalone -d perumdati.tech
```

### Issue: Connection Refused

**Symptom:**
```
ERR_CONNECTION_REFUSED
```

**Fix:**
1. Verify backend running:
   ```bash
   curl https://perumdati.tech:5000/health
   ```

2. Check firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 5000/tcp
   ```

3. Check backend is listening on correct interface:
   ```javascript
   // backend/server.js
   const PORT = process.env.PORT || 5000;
   const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
   
   server.listen(PORT, HOST, () => {
     console.log(`Server running on ${HOST}:${PORT}`);
   });
   ```

---

## ✅ Verification Checklist

- [ ] Backend running on port 5000
- [ ] Backend accessible from internet
- [ ] SSL certificate valid
- [ ] CORS configured for production domain
- [ ] Frontend `.env.local` updated
- [ ] Frontend restarted
- [ ] Test page works: `http://localhost:3000/api-test.html`
- [ ] Browser console shows correct API URL
- [ ] Network requests go to `perumdati.tech:5000`

---

## 📊 API Endpoints

All API calls now point to:

```
https://perumdati.tech:5000/api

Examples:
- https://perumdati.tech:5000/api/auth/me
- https://perumdati.tech:5000/api/vpn/devices
- https://perumdati.tech:5000/api/billing/subscription
- https://perumdati.tech:5000/api/credit/balance
```

---

## 🔒 Security Considerations

### Production Checklist:

1. ✅ **HTTPS Only** - All traffic encrypted
2. ✅ **CORS Whitelist** - Only allow trusted domains
3. ✅ **Rate Limiting** - Already configured
4. ✅ **Authentication** - Firebase JWT tokens
5. ✅ **Input Validation** - Sanitization middleware
6. ⚠️ **Firewall** - Restrict unnecessary ports
7. ⚠️ **Monitoring** - Add logging & alerting

---

## 📞 Testing from Client Side

After deployment, test with:

```bash
# Test health endpoint
curl https://perumdati.tech:5000/health

# Test API (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://perumdati.tech:5000/api/vpn/devices
```

---

**Last Updated**: March 10, 2026  
**Production API**: https://perumdati.tech:5000/api  
**Frontend**: http://localhost:3000
