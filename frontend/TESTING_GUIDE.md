# 🧪 Testing Guide - Admin Role & Menu

## 🎯 Cara Testing Menu Admin

### Prerequisites
1. Backend API sudah running di `http://localhost:3000`
2. Firebase sudah dikonfigurasi
3. Ada minimal 1 user dengan role `admin` di database

---

## 📋 Test Scenarios

### 1. Test Login sebagai User Biasa

**Steps:**
```bash
# 1. Pastikan tidak ada session aktif
# Logout dari aplikasi

# 2. Buka browser
http://localhost:3001

# 3. Login dengan akun user biasa (bukan admin)
```

**Expected Result:**
- ✅ Menu yang muncul: Dashboard, Devices, Wallet, Payment, Referral, Profile, Notifications
- ✅ Redirect ke `/dashboard`
- ✅ Tidak ada menu admin (Billing, Credit, dll)

---

### 2. Test Login sebagai Admin

**Steps:**
```bash
# 1. Pastikan user di database sudah di-set role: admin
# Di backend database (SQLite/PostgreSQL):

# SQLite:
sqlite3 /path/to/backend/database.db
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
.quit

# Atau via API (jika ada endpoint):
curl -X PATCH http://localhost:3000/api/admin/users/{user_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'

# 2. Logout dari aplikasi
# 3. Login kembali dengan akun admin
```

**Expected Result:**
- ✅ Menu yang muncul: Overview, Billing, Credit, Referrals, Payment Settings, Settings
- ✅ Redirect ke `/admin-dashboard`
- ✅ Icon sidebar berubah jadi 🛡️ (shield)
- ✅ Warna tema jadi ungu/purple

---

### 3. Test Switch Role (Tanpa Logout)

**Steps:**
```javascript
// Di browser console (F12):

// 1. Cek role saat ini
const { useAuthStore } = await import('./store');
const { userData, updateUserData } = useAuthStore.getState();
console.log('Current role:', userData?.role);

// 2. Update manual jadi admin
updateUserData({ role: 'admin' });

// 3. Refresh halaman
window.location.reload();

// 4. Menu seharusnya berubah jadi admin menu
```

**Expected Result:**
- ✅ Menu berubah otomatis setelah reload
- ✅ Theme berubah jadi purple

---

### 4. Test API Integration

**Test User API:**
```javascript
// Di browser console (setelah login):
const { userAPI } = await import('./lib/api');

try {
  const profile = await userAPI.getProfile();
  console.log('Profile:', profile);
} catch (error) {
  console.error('Error:', error);
}
```

**Test Admin API:**
```javascript
// Harus login sebagai admin
const { adminUsersAPI } = await import('./lib/api');

try {
  const users = await adminUsersAPI.getUsers();
  console.log('All users:', users);
} catch (error) {
  console.error('Error:', error);
}
```

**Test VPN API:**
```javascript
const { vpnAPI } = await import('./lib/api');

const devices = await vpnAPI.getDevices();
console.log('My devices:', devices);
```

---

### 5. Test Payment Flow

**Submit Payment (User):**
```bash
# 1. Login sebagai user
# 2. Menu Payment > Submit Payment
# 3. Isi form:
#    - Plan: Monthly
#    - Amount: 50000
#    - Bank From: BCA
#    - Transfer Date: Today
#    - Upload proof image
# 4. Submit
```

**Approve Payment (Admin):**
```bash
# 1. Login sebagai admin
# 2. Menu Billing > Pending
# 3. Klik payment yang baru submit
# 4. Approve dengan catatan
# 5. Cek subscription user aktif
```

---

## 🐛 Troubleshooting

### Menu Admin Tidak Muncul Setelah Role Diubah

**Problem:**
> Role sudah diubah di database, tapi menu tetap user menu

**Solutions:**

1. **Logout dan Login Ulang**
   ```bash
   # Klik tombol Logout
   # Login kembali dengan akun yang sama
   ```

2. **Clear Browser Cache**
   ```bash
   # Chrome: Ctrl+Shift+Delete
   # Pilih "Cached images and files"
   # Clear data
   ```

3. **Hard Refresh**
   ```bash
   # Windows/Linux: Ctrl+F5
   # Mac: Cmd+Shift+R
   ```

4. **Check Console Log**
   ```javascript
   // F12 > Console
   const { useAuthStore } = await import('./store');
   const { userData } = useAuthStore.getState();
   console.log('User data:', userData);
   console.log('Is admin?', userData?.role === 'admin');
   ```

5. **Check Network Tab**
   ```bash
   # F12 > Network
   # Cari request ke /api/auth/login
   # Response harus include: { "user": { "role": "admin" } }
   ```

6. **Incognito Mode**
   ```bash
   # Coba buka di incognito/private mode
   # Login dengan akun admin
   ```

---

### API Returns 401 Unauthorized

**Problem:**
> Semua API call return 401

**Solutions:**

1. **Check Token di LocalStorage**
   ```javascript
   console.log('Token:', localStorage.getItem('token'));
   ```

2. **Re-login**
   ```bash
   # Logout
   # Login kembali
   ```

3. **Check Firebase Config**
   ```bash
   # Pastikan .env.local sudah benar
   # NEXT_PUBLIC_FIREBASE_API_KEY=...
   ```

---

### Menu Kosong/Tidak Ada

**Problem:**
> Sidebar kosong atau tidak ada menu

**Solutions:**

1. **Check Component Props**
   ```javascript
   // Di pages/index.js, pastikan menuItems di-pass ke Layout
   <Layout
     menuItems={allMenuItems}  // <-- Harus ada
     ...
   />
   ```

2. **Check Console Errors**
   ```bash
   # F12 > Console
   # Lihat ada error merah atau tidak
   ```

3. **Rebuild Next.js**
   ```bash
   npm run build
   npm run dev
   ```

---

## ✅ Checklist Testing

### User Testing
- [ ] Login dengan Google berhasil
- [ ] Menu user muncul (7 items)
- [ ] Redirect ke dashboard
- [ ] Generate VPN config berhasil
- [ ] Submit payment berhasil
- [ ] Referral link ter-generate
- [ ] Profile bisa di-edit
- [ ] Notifikasi muncul

### Admin Testing
- [ ] Login dengan akun admin
- [ ] Menu admin muncul (6 items)
- [ ] Redirect ke admin dashboard
- [ ] Lihat list users
- [ ] Approve payment berhasil
- [ ] Reject payment berhasil
- [ ] Enable/disable VPN user
- [ ] Add credit ke user
- [ ] Settings bisa diubah

### API Testing
- [ ] `/api/auth/login` - Login
- [ ] `/api/auth/profile` - Get profile
- [ ] `/api/vpn/devices` - Get devices
- [ ] `/api/billing/subscription` - Get subscription
- [ ] `/api/credit/balance` - Get balance
- [ ] `/api/referral/code` - Get referral code
- [ ] `/api/admin/users` - Get all users (admin only)
- [ ] `/api/admin/payments` - Get payments (admin only)

---

## 📊 Test Data Examples

### Sample Admin User
```json
{
  "uid": "abc123xyz",
  "email": "admin@vpnaccess.local",
  "role": "admin",
  "vpn_enabled": true,
  "display_name": "Admin User"
}
```

### Sample Regular User
```json
{
  "uid": "def456uvw",
  "email": "user@example.com",
  "role": "user",
  "vpn_enabled": true,
  "display_name": "John Doe"
}
```

### Sample API Response (Login)
```json
{
  "user": {
    "uid": "abc123xyz",
    "email": "admin@vpnaccess.local",
    "role": "admin",
    "vpn_enabled": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_data": {
    "uid": "abc123xyz",
    "email": "admin@vpnaccess.local",
    "role": "admin",
    "vpn_enabled": true,
    "display_name": "Admin User",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🔗 Quick Links

- API Documentation: http://localhost:3000/api-docs/
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

---

**Last Updated**: March 2024
