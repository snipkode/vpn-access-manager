# Backend Setup & Restart Guide

## 🚨 Important: Restart Backend After Changes

Setelah menambahkan endpoint baru atau mengubah code backend, **WAJIB restart server**.

---

## 🔄 Restart Backend

### 1. **Stop Current Server**
```bash
# Jika running di foreground (Ctrl+C)
Ctrl+C

# Jika running di background
ps aux | grep "node.*server"
kill <PID>
```

### 2. **Start Backend Server**
```bash
cd /home/vpn-access-manager/backend

# Development mode (auto-reload)
npm run dev

# Atau production mode
npm start
```

### 3. **Verify Server Running**
```bash
# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Atau test endpoint
curl http://localhost:3000/api/health
```

---

## 🧪 Test New Endpoints

### 1. **Test Health Endpoint**
```bash
# Get auth token first (from browser console after login)
TOKEN="your_firebase_token_here"

# Test health endpoint
curl -X GET http://localhost:3000/api/vpn/health \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "wireguard_healthy": true,
  "total_devices": 5,
  "active_peers": 5,
  "ip_utilization": "5/252",
  "ip_utilization_percent": 2,
  "orphaned_peers": 0,
  "stale_records": 0,
  "sync_status": "synced"
}
```

### 2. **Test IP Pool Endpoint**
```bash
curl -X GET http://localhost:3000/api/vpn/ip-pool \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "pool": [...],
  "summary": {
    "total": 5,
    "active": 5,
    "stale": 0,
    "orphaned": 0,
    "available": 247
  }
}
```

### 3. **Test Sync Endpoint**
```bash
curl -X POST http://localhost:3000/api/vpn/sync \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "sync_completed": true,
  "actions": [...],
  "total_actions": 0
}
```

---

## 🐛 Troubleshooting

### Error: 404 Not Found

**Cause:** Endpoint belum ter-load (server belum restart)

**Solution:**
```bash
# 1. Stop server
Ctrl+C

# 2. Start again
cd /home/vpn-access-manager/backend
npm run dev
```

### Error: 401 Unauthorized

**Cause:** Token tidak valid atau expired

**Solution:**
```javascript
// Get fresh token from browser console
firebase.auth().currentUser.getIdToken(true)
  .then(token => console.log(token));
// Copy token dan update variable TOKEN
```

### Error: 403 Forbidden

**Cause:** User bukan admin

**Solution:**
```javascript
// Set user sebagai admin di Firestore
// Go to Firebase Console → Firestore
// Find user document → Update role: "admin"
```

### Error: WireGuard commands fail

**Cause:** WireGuard tidak installed atau tidak running

**Solution:**
```bash
# Check WireGuard status
wg show

# If not installed, install first
sudo apt update
sudo apt install wireguard

# Start WireGuard interface
sudo wg-quick up wg0
```

---

## 📋 Checklist After Backend Changes

- [ ] Stop current server (Ctrl+C)
- [ ] Start server again (`npm run dev`)
- [ ] Wait for "Server running on port 3000" message
- [ ] Test endpoint dengan curl atau browser
- [ ] Check backend logs untuk errors
- [ ] Verify frontend dapat connect

---

## 🔍 Check Backend Logs

```bash
# Tail logs (if running in background)
tail -f /path/to/backend/logs/app.log

# Atau lihat di terminal tempat server running
# Semua console.log akan muncul di sini
```

---

## ✅ Verify All Endpoints

```bash
# User endpoints
GET  /api/vpn/devices
POST /api/vpn/generate
GET  /api/vpn/device/:id
DELETE /api/vpn/device/:id

# Admin endpoints
GET  /api/vpn/health
GET  /api/vpn/ip-pool
POST /api/vpn/sync
POST /api/vpn/admin/leases/cleanup
```

---

## 🎯 Quick Test Script

Simpan sebagai `test-vpn-endpoints.sh`:

```bash
#!/bin/bash

TOKEN="your_token_here"
BASE_URL="http://localhost:3000/api"

echo "=== Testing VPN Endpoints ==="

echo -e "\n1. GET /vpn/devices"
curl -s -X GET "$BASE_URL/vpn/devices" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n2. GET /vpn/health (Admin only)"
curl -s -X GET "$BASE_URL/vpn/health" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n3. GET /vpn/ip-pool (Admin only)"
curl -s -X GET "$BASE_URL/vpn/ip-pool" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== Done ==="
```

Usage:
```bash
chmod +x test-vpn-endpoints.sh
./test-vpn-endpoints.sh
```

---

## 📝 Summary

**Setiap kali mengubah backend code:**
1. **STOP** server (Ctrl+C)
2. **START** server lagi (`npm run dev`)
3. **TEST** endpoint
4. **CHECK** logs untuk errors

**Endpoint baru TIDAK akan bekerja tanpa restart!**
