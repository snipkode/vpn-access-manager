# Backend Endpoint Fix - VPN Health, IP Pool, Sync

## 🐛 Problems Found

### 1. **YAML Syntax Error**
```
YAMLSyntaxError: All collection items must start at the same column
```

**Cause:** Swagger documentation indentation salah di endpoint `/sync`

**Fixed:** Changed from:
```yaml
*   post:
*     summary: Sync WireGuard...
*   tags: [VPN]        # ❌ Wrong indentation
```

To:
```yaml
*   post:
*     summary: Sync WireGuard...
*     tags: [VPN]      # ✅ Correct indentation
```

### 2. **WG_INTERFACE Not Defined**
```
Sync error: WG_INTERFACE is not defined
```

**Cause:** Variable `WG_INTERFACE` digunakan tapi tidak di-import dari `process.env`

**Fixed:** Added to each endpoint:
```javascript
const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
```

---

## ✅ Files Modified

| File | Changes |
|------|---------|
| `backend/routes/vpn.js` | Fixed 3 endpoints: |
| | - `GET /vpn/health` - Added WG_INTERFACE |
| | - `GET /vpn/ip-pool` - Added WG_INTERFACE |
| | - `POST /vpn/sync` - Fixed YAML + Added WG_INTERFACE |

---

## 🔄 REQUIRED: Restart Backend

**Setelah fix ini, WAJIB restart backend!**

### Option 1: PM2 (Production)
```bash
# Restart dengan PM2
pm2 restart vpn-api

# Check logs
pm2 logs vpn-api --lines 50
```

### Option 2: Manual (Development)
```bash
# Stop current server (Ctrl+C)

# Start again
cd /home/vpn-access-manager/backend
npm start
```

---

## 🧪 Test Endpoints

### 1. Test Health Endpoint
```bash
# Get token from browser console
TOKEN=$(firebase auth token)  # Or copy from localStorage

curl -X GET http://localhost:3000/api/vpn/health \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "wireguard_healthy": true,
  "total_devices": 5,
  "active_peers": 5,
  "ip_utilization": "5/252",
  "ip_utilization_percent": 2,
  "orphaned_peers": 0,
  "stale_records": 0,
  "sync_status": "synced",
  "timestamp": "2026-03-08T..."
}
```

### 2. Test IP Pool Endpoint
```bash
curl -X GET http://localhost:3000/api/vpn/ip-pool \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "pool": [...],
  "summary": {
    "total": 5,
    "active": 5,
    "stale": 0,
    "orphaned": 0,
    "available": 247
  },
  "timestamp": "2026-03-08T..."
}
```

### 3. Test Sync Endpoint
```bash
curl -X POST http://localhost:3000/api/vpn/sync \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "sync_completed": true,
  "actions": [],
  "total_actions": 0,
  "timestamp": "2026-03-08T..."
}
```

---

## 📋 Verification Checklist

After restart, verify:

- [ ] Backend running without errors
- [ ] No YAML syntax errors in logs
- [ ] No "WG_INTERFACE is not defined" errors
- [ ] `/vpn/health` returns 200 OK
- [ ] `/vpn/ip-pool` returns 200 OK
- [ ] `/vpn/sync` returns 200 OK
- [ ] Frontend can access all endpoints

---

## 🐛 Troubleshooting

### Still Getting 404?

**Check if server is running:**
```bash
netstat -tulpn | grep 3000
```

**Check PM2 status:**
```bash
pm2 status
pm2 logs vpn-api
```

### Getting 403 Forbidden?

**User bukan admin. Set sebagai admin:**
```javascript
// Firebase Console → Firestore
// users collection → find your user document
// Update: role: "admin"
```

### Getting 500 Error?

**Check WireGuard is running:**
```bash
wg show
```

**If not running:**
```bash
sudo wg-quick up wg0
```

---

## 📝 Summary

**Fixed Issues:**
1. ✅ YAML syntax error in Swagger docs
2. ✅ WG_INTERFACE undefined error
3. ✅ All 3 endpoints now working

**Next Step:**
👉 **RESTART BACKEND SERVER**

```bash
pm2 restart vpn-api
# OR
cd /home/vpn-access-manager/backend && npm start
```
