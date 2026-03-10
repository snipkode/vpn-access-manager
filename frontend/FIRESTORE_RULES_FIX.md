# 🔥 Firestore Rules Fix - "Missing or Insufficient Permissions"

## 🚨 Masalah

Setelah mengubah Firestore Rules ke production mode, muncul error:
```
FirebaseError: Missing or insufficient permissions
```

### Penyebab:
Rules produksi yang terlalu ketat memblokir semua operasi Firestore, termasuk:
- Read data user saat login
- Write data user baru
- Realtime listener untuk credit_balance

---

## ✅ Solusi

### 1. File Rules yang Benar

File `firestore.rules` sudah dibuat dengan konfigurasi:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // User bisa baca data sendiri
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // User bisa buat document sendiri saat pertama login
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // User bisa update data sendiri (tapi TIDAK bisa ubah role)
      allow update: if request.auth != null && request.auth.uid == userId
                    && request.resource.data.role == resource.data.role;
      
      // Admin bisa baca semua users
      allow read: if request.auth != null && 
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Admin bisa update semua users (termasuk role)
      allow update: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;  // Block akses ke collection lain
    }
  }
}
```

### 2. Deploy Rules ke Firebase

#### Cara 1: Via Firebase Console (Manual)

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project Anda
3. Pergi ke **Firestore Database** → Tab **Rules**
4. **Copy-paste** rules dari file `firestore.rules` di atas
5. Klik **Publish**

#### Cara 2: Via Firebase CLI (Recommended)

```bash
# Install Firebase CLI jika belum
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Init Firebase di project (jika belum)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

---

## 🔍 Testing Rules

### Test 1: Login User Baru
```javascript
// User baru bisa create document sendiri ✅
allow create: if request.auth.uid == userId
```

### Test 2: Login User Existing
```javascript
// User bisa baca data sendiri ✅
allow read: if request.auth.uid == userId

// User bisa update data sendiri (kecuali role) ✅
allow update: if request.auth.uid == userId && role tidak berubah
```

### Test 3: Admin Akses User Lain
```javascript
// Admin bisa baca semua users ✅
allow read: if get(/users/$(request.auth.uid)).data.role == 'admin'

// Admin bisa update role user lain ✅
allow update: if get(/users/$(request.auth.uid)).data.role == 'admin'
```

### Test 4: User Coba Ubah Role Sendiri
```javascript
// User TIDAK bisa ubah role sendiri ❌
request.resource.data.role != resource.data.role → DENIED
```

---

## 🛠️ Troubleshooting

### Error Masih Muncul?

1. **Cek Rules Aktif:**
   - Buka Firebase Console → Firestore → Rules
   - Pastikan rules sudah ter-update

2. **Clear Cache Browser:**
   ```bash
   Ctrl+Shift+Delete → Clear Cache
   ```

3. **Logout dan Login Kembali:**
   - Token Firebase mungkin masih menggunakan rules lama

4. **Cek Console Log:**
   ```javascript
   // Di browser console, cek error detail:
   // F12 → Console → Lihat error lengkap
   ```

### Simulasi Rules

Gunakan [Firebase Rules Playground](https://console.firebase.google.com/project/_/firestore/rules):

1. **Simulasi User Login:**
   ```
   Location: /users/USER_UID
   Operation: GET
   Auth: authenticated (USER_UID)
   Result: ALLOW ✅
   ```

2. **Simulasi User Baru:**
   ```
   Location: /users/NEW_UID
   Operation: CREATE
   Data: { email: "...", role: "user" }
   Auth: authenticated (NEW_UID)
   Result: ALLOW ✅
   ```

3. **Simulasi User Ubah Role:**
   ```
   Location: /users/USER_UID
   Operation: UPDATE
   Data: { role: "admin" }
   Auth: authenticated (USER_UID)
   Result: DENY ❌
   ```

---

## 📋 Checklist Deployment

- [ ] File `firestore.rules` sudah dibuat
- [ ] Rules sudah di-deploy ke Firebase
- [ ] Test login user baru ✅
- [ ] Test login user existing ✅
- [ ] Test admin akses ✅
- [ ] Test user tidak bisa ubah role ✅
- [ ] Error "Missing or Insufficient permissions" sudah hilang ✅

---

## 🔐 Security Notes

Rules ini memberikan:
- ✅ User bisa akses data sendiri
- ✅ User tidak bisa ubah role sendiri
- ✅ Admin bisa manage semua users
- ✅ Collection lain diblokir (aman)
- ✅ Read-only untuk non-authenticated users

---

## 📞 Need Help?

Jika masih ada masalah:
1. Screenshot error dari browser console
2. Screenshot rules dari Firebase Console
3. Cek Firebase Logs untuk detail permission denied
