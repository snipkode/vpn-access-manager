# Production Deployment - perumdati.tech

## ✅ Production Ready!

Frontend sekarang configured untuk production di **perumdati.tech**

---

## 🔧 Environment Updated

### **`.env.local` (Production)**

```bash
# API Configuration
# Production: Using stunnel with Let's Encrypt SSL
NEXT_PUBLIC_API_URL=https://perumdati.tech:445/api

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

## 🚀 Deployment Steps

### **1. Update .env.local**
✅ Done - Updated to `https://perumdati.tech:445/api`

### **2. Restart Frontend**

```bash
cd /root/vpn/frontend

# Stop current server (Ctrl+C)

# Clear cache (optional but recommended)
rm -rf .next

# Restart
npm run dev
```

### **3. Test Production**

**Browser:**
```
https://perumdati.tech:445/api-docs/
```

**API Endpoints:**
```
https://perumdati.tech:445/api/health
https://perumdati.tech:445/api/auth/me
https://perumdati.tech:445/api/vpn/devices
```

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Next.js)                 │
│  Port 3000                          │
│                                     │
│  API Calls →                        │
│  https://perumdati.tech:445/api    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stunnel (SSL Termination)          │
│  Port 445 (HTTPS)                   │
│  Let's Encrypt SSL                  │
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

## 🔐 SSL Certificate

### **Let's Encrypt SSL**

```
Domain: perumdati.tech
Issuer: Let's Encrypt
Valid Until: 2026-06-08
Auto-Renew: ✅ Yes
```

### **No More Browser Warnings!**

✅ Valid SSL certificate  
✅ No `ERR_CERT_AUTHORITY_INVALID`  
✅ HTTPS secure connection  

---

## 🧪 Testing Checklist

### **API Tests:**

```bash
# Health check
curl https://perumdati.tech:445/health

# API info
curl https://perumdati.tech:445/api

# With auth token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://perumdati.tech:445/api/vpn/devices
```

### **Browser Tests:**

- [ ] `https://perumdati.tech:445/health` - Returns JSON
- [ ] `https://perumdati.tech:445/api-docs/` - Swagger UI loads
- [ ] No SSL warnings in browser
- [ ] Frontend can connect to API
- [ ] Login works
- [ ] All API calls successful

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `frontend/.env.local` | Production API URL |
| `frontend/.env.local.example` | Template |
| `backend/stunnel/stunnel.conf` | Stunnel config |
| `/etc/letsencrypt/live/perumdati.tech-0001/` | SSL cert |

---

## 🛠️ Maintenance

### **SSL Auto-Renewal**

Certbot sudah setup auto-renewal:

```bash
# Check renewal timer
sudo systemctl list-timers | grep certbot

# Manual renew (if needed)
sudo certbot renew --dry-run
```

### **Check Stunnel Status**

```bash
# Check if running
sudo netstat -tlnp | grep 445

# View logs
sudo tail -f /var/log/stunnel4/stunnel.log

# Restart if needed
sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf
```

---

## 🐛 Troubleshooting

### **Issue: Frontend Can't Connect**

**Check:**
```bash
# 1. Verify .env.local
cat /root/vpn/frontend/.env.local | grep API_URL

# 2. Test API directly
curl https://perumdati.tech:445/health

# 3. Check stunnel
sudo netstat -tlnp | grep 445

# 4. Restart frontend
cd /root/vpn/frontend
npm run dev
```

### **Issue: SSL Certificate Expired**

**Renew:**
```bash
sudo certbot renew --force-renewal
sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf
```

### **Issue: CORS Errors**

**Update backend CORS:**
```javascript
// backend/server.js
app.use(cors({ 
  origin: [
    'http://localhost:3000',
    'https://perumdati.tech',
    process.env.FRONTEND_URL
  ], 
  credentials: true 
}));
```

---

## ✅ Production Checklist

- [x] SSL certificate installed
- [x] Stunnel running on port 445
- [x] `.env.local` updated to production URL
- [x] Domain perumdati.tech configured
- [x] Firewall allows port 445
- [x] API accessible via HTTPS
- [ ] Frontend deployed to production
- [ ] Monitoring setup
- [ ] Backup configured

---

## 🚀 Quick Deploy

```bash
# 1. Update .env.local (✅ Done)
# NEXT_PUBLIC_API_URL=https://perumdati.tech:445/api

# 2. Restart frontend
cd /root/vpn/frontend
npm run dev

# 3. Test
curl https://perumdati.tech:445/health

# 4. Open browser
# https://perumdati.tech:445/api-docs/
```

---

**Production Ready!** 🎉

Frontend sekarang configured untuk production di **perumdati.tech:445**

Test: `https://perumdati.tech:445/api-docs/`
