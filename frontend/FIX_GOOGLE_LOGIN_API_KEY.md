# 🔧 Fix: Google Login API Key Invalid

## 🚨 Masalah

Error yang muncul:
```
FirebaseError: Firebase: Error (auth/invalid-api-key)
```

atau

```
Error: INVALID_API_KEY
```

## 🎯 Penyebab

File `.env.local` masih menggunakan **placeholder values**, bukan Firebase config yang asli:

```bash
# ❌ SALAH - Ini hanya contoh!
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBLgPQvZm5J3K9qF8YqH3xJ9Z2nV7wX4pM
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

---

## ✅ Solusi: Dapatkan Firebase Config Asli

### Step 1: Buka Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Login dengan Google account Anda
3. Pilih project **e-prum**

### Step 2: Dapatkan Firebase Config

1. Klik **Settings** ⚙️ (roda gigi di sidebar kiri)
2. Klik **Project settings**
3. Scroll ke bagian **"Your apps"**
4. Jika belum ada web app, klik icon **Web** `</>` dan register app
5. Copy **firebaseConfig** object

### Step 3: Update .env.local

Buka file `/root/vpn/frontend/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Firebase Configuration - UPDATE DENGAN VALUES ASLI!
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...              # ← Copy dari Firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com  # ← Copy dari Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum           # ← Copy dari Firebase
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.appspot.com   # ← Copy dari Firebase
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789       # ← Copy dari Firebase
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123       # ← Copy dari Firebase

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

---

## 🔍 Cara Mendapatkan Setiap Value

### 1. **API Key**
```
Firebase Console > Project Settings > General > Your apps > SDK setup and configuration
apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 2. **Auth Domain**
```
Firebase Console > Project Settings > General > Your apps
authDomain: "e-prum.firebaseapp.com"
```

### 3. **Project ID**
```
Firebase Console > Project Settings > General > Your apps
projectId: "e-prum"
```

### 4. **Storage Bucket**
```
Firebase Console > Project Settings > General > Your apps
storageBucket: "e-prum.appspot.com"
```

### 5. **Messaging Sender ID**
```
Firebase Console > Project Settings > General > Your apps
messagingSenderId: "123456789"
```

### 6. **App ID**
```
Firebase Console > Project Settings > General > Your apps
appId: "1:123456789:web:abc123def456"
```

---

## 🚀 Setelah Update .env.local

### 1. **Restart Frontend Development Server**

```bash
cd /root/vpn/frontend

# Stop server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### 2. **Clear Browser Cache**

```
Chrome/Edge:
- Ctrl+Shift+Delete
- Clear "Cached images and files"
- Clear "Cookies and other site data"
- Reload page (Ctrl+R)

Firefox:
- Ctrl+Shift+Delete
- Clear "Cache"
- Clear "Cookies"
- Reload page
```

### 3. **Test Google Login**

1. Buka `http://localhost:3000`
2. Click "Login" atau "Get Started Free"
3. Click "Sign in with Google"
4. Seharusnya popup Google login muncul!

---

## 🐛 Troubleshooting

### Issue: Masih error "invalid-api-key"

**Check:**
```bash
# Verify .env.local values
cat /root/vpn/frontend/.env.local

# Pastikan NEXT_PUBLIC_ prefix ada
# Pastikan tidak ada spasi atau quotes yang salah
```

**Expected format:**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
# NOT:
# NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."  ← Jangan pakai quotes
# FIREBASE_API_KEY=...  ← Harus ada NEXT_PUBLIC_
```

### Issue: "auth/domain-not-found"

**Fix:**
```bash
# Check authDomain format
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com

# NOT:
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum  ← Kurang .firebaseapp.com
```

### Issue: "auth/invalid-app-id"

**Fix:**
```bash
# Check appId format (harus ada colon)
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# NOT:
# NEXT_PUBLIC_FIREBASE_APP_ID=abc123  ← Salah format
```

### Issue: Environment variables tidak terbaca

**Debug:**
```javascript
// Tambahkan di component atau console browser
console.log('Firebase Config:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})

// Di browser console (F12)
console.log(process.env)
```

---

## ✅ Verification Checklist

Setelah update, pastikan:

- [ ] `.env.local` ada di `/root/vpn/frontend/.env.local`
- [ ] Semua 6 Firebase values sudah di-update dengan values asli
- [ ] Semua variable pakai prefix `NEXT_PUBLIC_`
- [ ] Tidak ada quotes (`"`) di sekitar values
- [ ] Frontend sudah di-restart (`rm -rf .next && npm run dev`)
- [ ] Browser cache sudah di-clear
- [ ] Firebase project sudah enable Authentication > Google sign-in

---

## 🔐 Enable Google Sign-In di Firebase

Jika belum enable:

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project **e-prum**
3. Menu **Authentication** (sidebar kiri)
4. Tab **Sign-in method**
5. Click **Google**
6. Toggle **Enable**
7. Set **Project support email**
8. Click **Save**

---

## 📄 Contoh .env.local yang Benar

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=987654321
NEXT_PUBLIC_FIREBASE_APP_ID=1:987654321:web:xyz789abc

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

---

## 🎯 Quick Fix Command

```bash
# 1. Backup old config
cp /root/vpn/frontend/.env.local /root/vpn/frontend/.env.local.backup

# 2. Edit .env.local
nano /root/vpn/frontend/.env.local

# 3. Update dengan values dari Firebase Console

# 4. Restart frontend
cd /root/vpn/frontend
rm -rf .next
npm run dev
```

---

**Setelah fix ini, Google login seharusnya berfungsi!** 🎉

Test dengan:
1. Buka `http://localhost:3000`
2. Click login
3. Sign in dengan Google
4. Redirect ke dashboard

✅ Success!
