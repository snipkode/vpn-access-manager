# Frontend API Configuration - Stunnel Port 445

## ✅ Updated Configuration

Frontend sekarang menggunakan **stunnel port 445** (HTTPS) yang forward ke backend port 5000.

---

## 🔧 Environment Variables

### **`.env.local`** (Updated)

```bash
# API Configuration
# Using stunnel port 445 (forwards to backend port 5000)
NEXT_PUBLIC_API_URL=https://localhost:445/api

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBncC3pJuYzOT9LB0DQK0BXZiNyj1IsAqY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=537776493749
NEXT_PUBLIC_FIREBASE_APP_ID=1:537776493749:web:d6695740bf0ed1f7119afc

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

---

## 📁 Files Updated

| File | Change |
|------|--------|
| `.env.local` | `NEXT_PUBLIC_API_URL=https://localhost:445/api` |
| `.env.local.example` | Updated template |
| `lib/api.js` | Default URL updated |
| `store/index.js` | Default URL updated |
| `components/AdminBilling.js` | Image URL updated |
| `next.config.js` | Rewrites updated |

---

## 🚀 Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Next.js)                 │
│  Port 3000                          │
│                                     │
│  API Calls → https://localhost:445 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stunnel (SSL Termination)          │
│  Port 445 (HTTPS)                   │
│                                     │
│  Decrypts SSL → forwards to 5000    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend API (Express)              │
│  Port 5000 (HTTP)                   │
│                                     │
│  /api/* endpoints                   │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### **1. Verify Stunnel Running**

```bash
# Check port 445 listening
sudo netstat -tlnp | grep 445

# Should show:
# tcp  0  0 0.0.0.0:445  0.0.0.0:*  LISTEN  [PID]/stunnel4
```

### **2. Test API via Stunnel**

```bash
# Test health endpoint
curl -k https://localhost:445/health

# Should return:
# {"status":"ok","timestamp":"...","environment":{...}}
```

### **3. Test Frontend**

```bash
cd /root/vpn/frontend

# Restart frontend to pick up new env
npm run dev

# Open browser: http://localhost:3000
# Test login, API calls, etc.
```

---

## 🔐 SSL Certificate Warning

Karena menggunakan **self-signed certificate**, browser akan menampilkan warning:

```
Your connection is not private
NET::ERR_CERT_AUTHORITY_INVALID
```

### **Solution (Development Only):**

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

### **For Production:**

Use Let's Encrypt or valid SSL certificate:

```bash
# Get certificate from Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com

# Update stunnel config
cert = /etc/letsencrypt/live/yourdomain.com/fullchain.pem
key = /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

---

## 🛠️ Next.js Rewrites

**`next.config.js`:**

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'https://localhost:445/api/:path*',
    },
  ];
}
```

This allows:
- `/api/auth/login` → `https://localhost:445/api/auth/login`
- `/api/vpn/devices` → `https://localhost:445/api/vpn/devices`

---

## 📊 Environment Comparison

| Environment | API URL | Protocol |
|-------------|---------|----------|
| **Development (Old)** | `http://localhost:5000/api` | HTTP |
| **Development (New)** | `https://localhost:445/api` | HTTPS (stunnel) |
| **Production** | `https://yourdomain.com/api` | HTTPS |

---

## 🐛 Troubleshooting

### **Issue: Frontend can't connect to API**

**Check:**
```bash
# 1. Verify stunnel running
sudo netstat -tlnp | grep 445

# 2. Test API directly
curl -k https://localhost:445/health

# 3. Check frontend .env.local
cat /root/vpn/frontend/.env.local | grep API_URL

# 4. Restart frontend
cd /root/vpn/frontend
npm run dev
```

### **Issue: SSL Certificate Errors**

**Regenerate certificate:**
```bash
sudo openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
  -subj "/C=ID/ST=Indonesia/L=Jakarta/O=VPN/CN=localhost" \
  -keyout /etc/stunnel/stunnel.key \
  -out /etc/stunnel/stunnel.crt

sudo cat /etc/stunnel/stunnel.crt /etc/stunnel/stunnel.key > /etc/stunnel/stunnel.pem
sudo chmod 600 /etc/stunnel/stunnel.pem

sudo systemctl restart stunnel4
```

### **Issue: CORS Errors**

**Check backend CORS config:**
```javascript
// backend/server.js
app.use(cors({ 
  origin: [
    'http://localhost:3000',
    'https://localhost:445',
    process.env.FRONTEND_URL
  ], 
  credentials: true 
}));
```

---

## ✅ Verification Checklist

- [ ] Stunnel running on port 445
- [ ] `.env.local` updated to `https://localhost:445/api`
- [ ] Frontend restarted
- [ ] API calls working (check browser Network tab)
- [ ] SSL certificate valid
- [ ] No CORS errors in console
- [ ] Login works
- [ ] All API endpoints accessible

---

## 📝 Quick Commands

```bash
# Check stunnel status
sudo netstat -tlnp | grep 445

# Restart stunnel
sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf

# Check frontend env
cat /root/vpn/frontend/.env.local | grep API_URL

# Test API
curl -k https://localhost:445/health

# Restart frontend
cd /root/vpn/frontend
npm run dev
```

---

**Configuration Complete!** 🎉

Frontend sekarang menggunakan **HTTPS via stunnel port 445** untuk semua API calls!
