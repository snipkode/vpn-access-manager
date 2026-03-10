# Frontend Connection Troubleshooting Guide

## 🔧 Langkah Fix yang Sudah Dilakukan

### 1. ✅ Created `.env.local`
File: `/root/vpn/frontend/.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 2. ✅ Created API Test Page
URL: `http://localhost:3000/api-test.html`

---

## 🚀 Cara Menggunakan

### **Step 1: Restart Frontend Development Server**

PENTING! Next.js perlu di-restart untuk membaca `.env.local` yang baru:

```bash
cd /root/vpn/frontend

# Stop current process (Ctrl+C)

# Clear cache
rm -rf .next

# Restart
npm run dev
```

### **Step 2: Test API Connection**

Buka browser dan akses:
```
http://localhost:3000/api-test.html
```

Halaman ini akan otomatis test:
- ✅ Backend health check
- ✅ CORS configuration
- ✅ API endpoint response
- ✅ Environment variables

### **Step 3: Check Browser Console**

Buka DevTools (F12) → Console tab

Cari error seperti:
```
❌ Failed to fetch
❌ CORS policy
❌ ERR_CONNECTION_REFUSED
❌ Access to fetch blocked
```

### **Step 4: Check Network Tab**

DevTools → Network tab

Filter: `devices` atau `subscription`

Klik request yang failed → Headers tab

Check:
- **Request URL**: Harus `http://localhost:5000/api/vpn/devices`
- **Status Code**: 0 = Failed, 200 = Success
- **Response**: Ada error message?

---

## 🐛 Kemungkinan Masalah & Fix

### Problem 1: Backend Tidak Running
**Symptom**: `ERR_CONNECTION_REFUSED`

**Fix**:
```bash
cd /root/vpn/backend
npm start
```

Verify:
```bash
curl http://localhost:5000/health
```

---

### Problem 2: CORS Error
**Symptom**: 
```
Access to fetch at 'http://localhost:5000/api/vpn/devices' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Fix**: Backend sudah configure CORS dengan benar:
```javascript
app.use(cors({ 
  origin: process.env.FRONTEND_URL || '*', 
  credentials: true 
}));
```

Jika masih CORS error, restart backend:
```bash
cd /root/vpn/backend
# Ctrl+C to stop
npm start
```

---

### Problem 3: Wrong API URL
**Symptom**: Request ke port 3000 bukan 5000

**Check**:
```javascript
// Di browser console (F12)
console.log(process.env.NEXT_PUBLIC_API_URL)
```

Harusnya: `http://localhost:5000/api`

**Fix**:
1. Pastikan `.env.local` ada:
   ```bash
   cat /root/vpn/frontend/.env.local
   ```

2. Restart frontend:
   ```bash
   cd /root/vpn/frontend
   rm -rf .next
   npm run dev
   ```

---

### Problem 4: Token Expired/Invalid
**Symptom**: `401 Unauthorized` atau `Invalid token`

**Fix**:
1. Logout dan login ulang
2. Clear browser cache & cookies
3. Refresh halaman (F5)

---

### Problem 5: Next.js Caching
**Symptom**: Perubahan .env tidak terbaca

**Fix**:
```bash
cd /root/vpn/frontend
rm -rf .next node_modules/.cache
npm run dev
```

---

## 📋 Checklist Debugging

- [ ] Backend running di port 5000
  ```bash
  curl http://localhost:5000/health
  ```

- [ ] File `.env.local` ada dan benar
  ```bash
  cat /root/vpn/frontend/.env.local
  ```

- [ ] Frontend di-restart setelah buat .env.local
  ```bash
  cd /root/vpn/frontend
  npm run dev
  ```

- [ ] Test page works
  ```
  http://localhost:3000/api-test.html
  ```

- [ ] Browser console tidak ada error CORS

- [ ] Network tab: Request URL benar (port 5000)

---

## 🎯 Quick Test Commands

```bash
# 1. Test backend health
curl http://localhost:5000/health

# 2. Test API info
curl http://localhost:5000/api

# 3. Check if frontend running
curl http://localhost:3000

# 4. Check .env.local
cat /root/vpn/frontend/.env.local | grep API_URL

# 5. Check backend .env
cat /root/vpn/backend/.env | grep PORT
```

---

## 🔍 Expected Results

### Success:
```
✅ Health: {"status":"ok",...}
✅ API: {"name":"VPN Access Backend API",...}
✅ CORS: Access-Control-Allow-Origin: *
✅ Network: devices request = 200 OK
```

### Failed:
```
❌ Health: ERR_CONNECTION_REFUSED → Backend tidak running
❌ CORS: Blocked by CORS policy → Check backend CORS
❌ Network: Status 0 → Request tidak sampai
❌ 401: Invalid token → Login ulang
```

---

## 📞 Next Steps

Setelah restart frontend:

1. Buka `http://localhost:3000/api-test.html`
2. Screenshot hasil test
3. Buka DevTools → Console
4. Screenshot jika ada error
5. Share hasilnya!

---

**Last Updated**: March 10, 2026  
**Backend Port**: 5000  
**Frontend Port**: 3000
