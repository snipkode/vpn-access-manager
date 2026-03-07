# WireGuard Peer Troubleshooting Guide

## 📋 Masalah: Peer Tidak Muncul Setelah Generate

Jika peer tidak muncul di WireGuard interface setelah generate, ikuti langkah berikut:

---

## 🔍 **Step 1: Diagnosa Otomatis**

```bash
cd backend
npm run diagnose
```

Script ini akan cek:
- ✅ Server process running
- ✅ WireGuard interface active
- ✅ Config file exists
- ✅ Peers visible di interface
- ✅ Devices di database

---

## 🔍 **Step 2: Cek Manual WireGuard**

### **A. Cek Interface Status**
```bash
sudo wg show wg0
```

**Output normal:**
```
interface: wg0
  public key: xxx...
  private key: (hidden)
  listening port: 51820
```

**Jika error "does not exist":**
```bash
# Start interface
sudo wg-quick up wg0

# Atau via systemctl
sudo systemctl start wg-quick@wg0
```

---

### **B. Cek Peers yang Terdaftar**
```bash
sudo wg show wg0 allowed-ips
```

**Output normal:**
```
peer: abc123...
  allowed ips: 10.0.0.2/32

peer: def456...
  allowed ips: 10.0.0.3/32
```

**Jika kosong tapi ada device di database:**
- ❌ `addPeer()` gagal menambahkan peer
- Cek log server untuk error detail

---

### **C. Cek Config File**
```bash
sudo cat /etc/wireguard/wg0.conf
```

**Format yang benar:**
```ini
[Interface]
Address = 10.0.0.1/24
PrivateKey = (server private key)
ListenPort = 51820

[Peer]
PublicKey = (client public key 1)
AllowedIPs = 10.0.0.2/32

[Peer]
PublicKey = (client public key 2)
AllowedIPs = 10.0.0.3/32
```

---

## 🔍 **Step 3: Cek Log Server**

```bash
# Tail log saat generate
tail -f /path/to/backend/logs/app.log

# Atau lihat output console server
```

**Cari log berikut:**
```
[INFO] Adding WireGuard peer: xxx... with IP: 10.0.0.x
[INFO] WireGuard peer added via wg set
[INFO] Peer verification: OK
```

**Jika ada error:**
```
[ERROR] Failed to add WireGuard peer: ...
```

---

## 🔍 **Step 4: Test Add Peer Manual**

### **Test Generate Key**
```bash
# Generate private key
wg genkey

# Generate public key
wg genkey | wg pubkey
```

### **Test Add Peer Manual**
```bash
# Generate test key
TEST_KEY=$(wg genkey | wg pubkey)
echo "Test public key: $TEST_KEY"

# Add peer manual
sudo wg set wg0 peer $TEST_KEY allowed-ips 10.0.0.254/32

# Verify
sudo wg show wg0 allowed-ips | grep 10.0.0.254

# Cleanup
sudo wg set wg0 peer $TEST_KEY remove
```

**Jika manual berhasil tapi via API gagal:**
- Problem di code `addPeer()` function
- Cek timeout, stdio, atau permission

---

## 🔍 **Step 5: Cek Database vs WireGuard**

```bash
# Cek devices di Firestore
# Gunakan Firebase Console atau:
node -e "
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
db.collection('devices').where('status', '==', 'active').get()
  .then(snap => snap.forEach(d => console.log(d.id, d.data())));
"
```

**Bandingkan dengan:**
```bash
sudo wg show wg0 allowed-ips
```

**Jika database ada tapi wg tidak ada:**
- ❌ `addPeer()` gagal tapi tidak throw error
- ❌ Interface down saat add peer
- ❌ Permission issue

---

## 🛠️ **Solutions Based on Symptoms**

### **Symptom 1: Interface Tidak Ada**

```bash
# Start interface
sudo wg-quick up wg0

# Enable auto-start
sudo systemctl enable wg-quick@wg0
```

---

### **Symptom 2: Permission Denied**

```bash
# Check if running as root
id

# If not root, run server with sudo
sudo node server.js

# Or set capabilities for wg command
sudo setcap cap_net_admin+ep /usr/bin/wg
```

---

### **Symptom 3: Config File Tidak Ada**

```bash
# Run setup
cd backend
sudo npm run setup:vpn
```

---

### **Symptom 4: Peer Ditambahkan Tapi Hilang Setelah Restart**

**Problem:** `wg set` hanya runtime, tidak save ke config

**Solution:**
```bash
# Save config setelah add peer
sudo wg-quick save wg0

# Atau gunakan wg syncconf
sudo wg syncconf wg0 <(wg-quick strip wg0)
```

**Note:** Code sudah menggunakan `wg syncconf` setelah `wg set`

---

### **Symptom 5: Database Ada, WireGuard Kosong**

**Kemungkinan:**
1. `addPeer()` throw error tapi caught silently
2. Interface down saat add peer
3. Race condition

**Fix:**
1. Cek log server untuk error detail
2. Run diagnostic: `npm run diagnose`
3. Restart server dan coba lagi

---

## 🧪 **Test Full Flow**

### **1. Generate Device**
```bash
curl -X POST http://localhost:3000/api/vpn/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceName": "Test Device"}'
```

### **2. Verify Peer Added**
```bash
sudo wg show wg0 allowed-ips
```

### **3. Cek Log**
```
[INFO] WireGuard status before adding peer:
{
  "status": "active",
  "peers": 2
}
[INFO] Adding peer with public_key: xxx... and IP: 10.0.0.3
[INFO] WireGuard peer added via wg set
[INFO] Peer verification: OK
[INFO] WireGuard status after adding peer:
{
  "status": "active",
  "peers": 3
}
```

---

## 📊 **Common Error Messages**

| Error | Cause | Solution |
|-------|-------|----------|
| `wg: command not found` | WireGuard tools not installed | `sudo apt install wireguard-tools` |
| `RTNETLINK answers: File exists` | Peer already exists | Remove peer first or use different key |
| `Operation not permitted` | Not running as root | Run with `sudo` or set capabilities |
| `wg0: invalid interface` | Interface not created | Run `sudo wg-quick up wg0` |
| `No available IP addresses` | Subnet exhausted | Increase subnet size or remove old devices |

---

## 🔧 **Manual Fix: Re-sync Database to WireGuard**

Jika peer di database tapi tidak di WireGuard:

```javascript
// backend/scripts/resync-peers.js
import { db } from '../config/firebase.js';
import { addPeer } from '../services/wireguard.js';

const devices = await db.collection('devices')
  .where('status', '==', 'active')
  .get();

for (const doc of devices.docs) {
  const data = doc.data();
  try {
    addPeer(data.public_key, data.ip_address);
    console.log(`Synced: ${doc.id}`);
  } catch (error) {
    console.error(`Failed to sync: ${doc.id}`, error.message);
  }
}
```

Run:
```bash
cd backend
sudo node scripts/resync-peers.js
```

---

## ✅ **Checklist After Fix**

- [ ] WireGuard interface active (`wg show wg0`)
- [ ] Peers visible in `wg show wg0 allowed-ips`
- [ ] Config file exists (`/etc/wireguard/wg0.conf`)
- [ ] Server running without errors
- [ ] Generate endpoint returns success
- [ ] New peer appears in WireGuard after generate
- [ ] Diagnostic script passes all checks

---

## 📞 **Need More Help?**

If problem persists:

1. **Collect logs:**
   ```bash
   tail -100 /path/to/backend/logs/app.log
   sudo journalctl -u wg-quick@wg0 -n 50
   ```

2. **Run full diagnosis:**
   ```bash
   npm run diagnose > diagnosis.txt 2>&1
   ```

3. **Check system:**
   ```bash
   uname -a
   wg --version
   node --version
   ```

---

**Last Updated:** 2026-03-07
**Version:** 1.0.0
