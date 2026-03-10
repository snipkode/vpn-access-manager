# Production Setup - perumdati.tech

## ✅ Domain Access Working!

API sudah bisa diakses via domain **perumdati.tech** port **445**.

---

## 🌐 Access URLs

### **Production:**
```
https://perumdati.tech:445/api
```

### **Endpoints:**
```
https://perumdati.tech:445/api/health
https://perumdati.tech:445/api/auth/me
https://perumdati.tech:445/api/vpn/devices
https://perumdati.tech:445/api/billing/subscription
https://perumdati.tech:445/api/credit/balance
```

---

## 🧪 Test Results

### **Health Check:**
```bash
curl -k https://perumdati.tech:445/health

# Response:
{
  "status": "ok",
  "timestamp": "2026-03-10T05:48:04.337Z",
  "environment": {
    "nodeEnv": "development",
    "port": "5000",
    "hasEmail": false,
    "hasWireGuard": true
  },
  "uptime": 9141.070759328
}
```

### **API Endpoint:**
```bash
curl -k https://perumdati.tech:445/api/vpn/devices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response (unauthorized - expected):
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid token"
}
```

---

## 🔧 Frontend Configuration

### **`.env.local` for Production:**

```bash
# API Configuration - Production
NEXT_PUBLIC_API_URL=https://perumdati.tech:445/api

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBncC3pJuYzOT9LB0DQK0BXZiNyj1IsAqY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=537776493749
NEXT_PUBLIC_FIREBASE_APP_ID=1:537776493749:web:d6695740bf0ed1f7119afc

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=https://perumdati.tech
```

---

## 🔐 SSL Certificate

### **Current: Self-Signed**

Browser akan tampilkan warning:
```
Your connection is not private
NET::ERR_CERT_AUTHORITY_INVALID
```

**Workaround (Development):**
- Chrome: Advanced → Proceed to perumdati.tech (unsafe)
- Firefox: Advanced → Accept the Risk and Continue

### **Recommended: Let's Encrypt**

**1. Install Certbot:**
```bash
sudo apt-get install certbot python3-certbot-nginx
```

**2. Get Certificate:**
```bash
sudo certbot certonly --standalone -d perumdati.tech
```

**3. Update Stunnel Config:**
```bash
sudo nano /etc/stunnel/stunnel.conf
```

```ini
[vpn-api-445]
accept = 445
connect = 5000
client = no
cert = /etc/letsencrypt/live/perumdati.tech/fullchain.pem
key = /etc/letsencrypt/live/perumdati.tech/privkey.pem
```

**4. Restart Stunnel:**
```bash
sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf
```

---

## 🛡️ Firewall Configuration

### **Current Status:**
```bash
sudo ufw status

# Output:
445/tcp                    ALLOW       Anywhere
445/tcp (v6)               ALLOW       Anywhere (v6)
```

### **If Port 445 Not Allowed:**
```bash
sudo ufw allow 445/tcp
sudo ufw reload
```

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│  Client / Browser                   │
│  https://perumdati.tech:445        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stunnel (SSL Termination)          │
│  Port 445 (HTTPS)                   │
│  Decrypts SSL → forwards to 5000    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend API (Express)              │
│  Port 5000 (HTTP)                   │
│  /api/* endpoints                   │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### **From Server:**
```bash
# Test localhost
curl -k https://localhost:445/health

# Test with domain
curl -k https://perumdati.tech:445/health

# Test API endpoint
curl -k https://perumdati.tech:445/api
```

### **From External/Client:**
```bash
# Test from another server/computer
curl -k https://perumdati.tech:445/health

# Test with verbose output
curl -v https://perumdati.tech:445/health
```

### **Browser Test:**
```
https://perumdati.tech:445/api-docs/
```

Should show Swagger documentation (with SSL warning).

---

## 🐛 Troubleshooting

### **Issue: Connection Timed Out**

**Check:**
```bash
# 1. Verify stunnel running
sudo netstat -tlnp | grep 445

# 2. Check firewall
sudo ufw status | grep 445

# 3. Test from server
curl -k https://localhost:445/health
```

**Fix:**
```bash
# Allow port 445
sudo ufw allow 445/tcp

# Restart stunnel
sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf
```

### **Issue: SSL Certificate Error**

**Check:**
```bash
# Verify certificate exists
ls -la /etc/stunnel/stunnel.pem
ls -la /etc/stunnel/stunnel.key
```

**Fix:**
```bash
# Regenerate certificate
sudo openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
  -subj "/C=ID/ST=Indonesia/L=Jakarta/O=VPN/CN=perumdati.tech" \
  -keyout /etc/stunnel/stunnel.key \
  -out /etc/stunnel/stunnel.crt

sudo cat /etc/stunnel/stunnel.crt /etc/stunnel/stunnel.key > /etc/stunnel/stunnel.pem
sudo chmod 600 /etc/stunnel/stunnel.pem

sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf
```

### **Issue: Domain Not Resolving**

**Check DNS:**
```bash
# Check DNS resolution
nslookup perumdati.tech
dig perumdati.tech

# Should show your server IP
```

**Fix:**
- Update DNS A record at domain registrar
- Point `perumdati.tech` to your server IP
- Wait for DNS propagation (up to 24 hours)

---

## 📝 Quick Commands

```bash
# Check stunnel status
sudo netstat -tlnp | grep 445

# Test API
curl -k https://perumdati.tech:445/health

# Check logs
sudo tail -f /var/log/stunnel4/stunnel.log

# Restart stunnel
sudo pkill -9 stunnel4
sudo stunnel4 /etc/stunnel/stunnel.conf

# Check firewall
sudo ufw status

# Allow port 445
sudo ufw allow 445/tcp
```

---

## ✅ Production Checklist

- [x] Stunnel running on port 445
- [x] Domain perumdati.tech configured
- [x] Firewall allows port 445
- [x] API accessible via domain
- [x] Frontend .env.local updated
- [ ] SSL certificate from Let's Encrypt (recommended)
- [ ] Frontend deployed to production
- [ ] CORS configured for production domain

---

## 🚀 Deployment Steps

**1. Update Frontend .env.local:**
```bash
NEXT_PUBLIC_API_URL=https://perumdati.tech:445/api
```

**2. Build Frontend:**
```bash
cd /root/vpn/frontend
npm run build
```

**3. Start Frontend:**
```bash
npm start
# Or use PM2
pm2 start npm --name "vpn-frontend" -- start
```

**4. Test Production:**
```
https://perumdati.tech:445/api/health
```

---

**Domain perumdati.tech sudah siap digunakan!** 🎉

Test: `curl -k https://perumdati.tech:445/health`
