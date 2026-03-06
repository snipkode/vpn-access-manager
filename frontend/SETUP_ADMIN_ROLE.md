# Setup Admin Role via Firestore

## ✅ Flow Baru: Role dari Firestore

User data disimpan di Firestore collection `users`:
```
/users/{uid}
  - email: string
  - name: string
  - role: "user" | "admin"
  - vpn_enabled: boolean
  - photoURL: string
  - provider: string
  - createdAt: timestamp
  - lastLogin: timestamp
```

---

## Cara 1: Via Firebase Console (Paling Mudah)

1. **Buka [Firebase Console](https://console.firebase.google.com/)**
2. Pilih project Anda
3. Pergi ke **Firestore Database**
4. Cari collection **`users`**
5. Cari document dengan email `solusikonsep@gmail.com`
   - Atau cari berdasarkan UID
6. **Edit field `role`** dari `"user"` menjadi `"admin"`
7. **Save**

### Screenshot Steps:
```
Firestore Database
  └── users (collection)
      └── {UID} (document)
          ├── email: "solusikonsep@gmail.com"
          ├── name: "..."
          ├── role: "admin"  ← Ubah ini!
          └── vpn_enabled: true
```

---

## Cara 2: Via Browser Console (Quick)

1. **Login** dengan akun admin (`solusikonsep@gmail.com`)
2. Buka **Browser Console** (F12)
3. Jalankan script ini:

```javascript
// 1. Dapatkan UID user saat ini
const uid = firebase.auth().currentUser.uid;
console.log('Your UID:', uid);

// 2. Update role di Firestore
const userRef = firebase.firestore().doc(`users/${uid}`);
await userRef.update({ 
  role: 'admin',
  updatedAt: new Date().toISOString()
});

console.log('✅ Admin role set!');
```

4. **Logout** dan **Login kembali**
5. Dashboard admin akan muncul!

---

## Cara 3: Via Script (Automated)

Jika punya Firebase Admin SDK di backend:

```bash
cd backend
node scripts/set-admin-role.js
```

---

## Verify Role

Setelah set role, verifikasi:

1. **Logout** dari aplikasi
2. **Login kembali** dengan Google
3. Buka **Browser Console** (F12)
4. Cek log:
   ```
   📄 User data from Firestore: { role: "admin", ... }
   🔐 Firebase Auth: { email: "...", role: "admin" }
   🎯 Redirecting to: admin-dashboard (role: admin)
   ```
5. Dashboard admin akan muncul otomatis!

---

## Struktur Firestore

### Collection: `users`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | User email |
| `name` | string | Display name |
| `role` | string | `"user"` atau `"admin"` |
| `vpn_enabled` | boolean | VPN access status |
| `photoURL` | string | Profile picture URL |
| `provider` | string | Login provider (google.com) |
| `emailVerified` | boolean | Email verification status |
| `createdAt` | timestamp | Account creation time |
| `lastLogin` | timestamp | Last login time |

### Contoh Document:
```javascript
{
  email: "solusikonsep@gmail.com",
  name: "Solusi Konsep",
  role: "admin",
  vpn_enabled: true,
  photoURL: "https://lh3.googleusercontent.com/...",
  provider: "google.com",
  emailVerified: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  lastLogin: "2025-01-15T12:30:00.000Z"
}
```

---

## Tambah Admin Lain

Untuk menambah admin lain, cukup edit field `role` di Firestore:

```
/users/{uid-user-lain}
  role: "admin"
```

Tidak perlu deploy ulang atau restart server!

---

## Keamanan

⚠️ **PENTING**: Pastikan Firestore Rules membatasi write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // User bisa read/write data sendiri
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Hanya admin yang bisa ubah role
      allow update: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Troubleshooting

### Role tidak berubah?
- **Logout** dan **Login kembali** untuk refresh data
- Cek Firestore apakah field `role` benar-benar terupdate

### Document users tidak ada?
- Login dulu dengan akun Google
- Document akan dibuat otomatis saat pertama login

### Masih user biasa?
- Cek console browser, pastikan log menampilkan `role: "admin"`
- Clear cache browser dan coba lagi

