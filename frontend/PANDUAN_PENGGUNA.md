# 📘 Panduan Pengguna VPN Access

## 🚀 Memulai Cepat

### Login
1. Buka aplikasi
2. Klik tombol **"Sign in with Google"**
3. Pilih akun Google Anda
4. Anda akan otomatis masuk ke dashboard

### Menu Berdasarkan Role

#### 👤 User (Pengguna Biasa)
| Menu | Fungsi |
|------|--------|
| **Dashboard** | Lihat status subscription dan devices |
| **Devices** | Kelola device VPN (max 3 devices) |
| **Wallet** | Lihat saldo credit |
| **Payment** | Submit pembayaran untuk subscription |
| **Referral** | Dapatkan kode referral dan undang teman |
| **Profile** | Edit profil dan preferensi |
| **Notifications** | Lihat notifikasi |

#### 👨‍💼 Admin
| Menu | Fungsi |
|------|--------|
| **Overview** | Dashboard statistik pengguna & pembayaran |
| **Billing** | Approve/reject pembayaran, kelola plan & bank |
| **Credit** | Kelola credit user, lihat fraud alerts |
| **Referrals** | Kelola program referral user |
| **Payment Settings** | Konfigurasi sistem pembayaran |
| **Settings** | Konfigurasi WhatsApp, email, dan sistem |

---

## 📱 Cara Menggunakan (User)

### 1. Generate VPN Config
1. Masuk ke menu **Dashboard**
2. Ketik nama device (contoh: "iPhone 14", "MacBook Pro")
3. Klik **"Add Device"**
4. Config akan muncul dengan QR code
5. Scan QR code dengan aplikasi WireGuard
6. Atau download file config (.conf)

### 2. Submit Pembayaran
1. Masuk ke menu **Payment**
2. Pilih tab **"Submit Payment"**
3. Pilih plan (Monthly, Quarterly, Yearly)
4. Transfer ke rekening yang ditampilkan
5. Upload bukti transfer (screenshot/PDF)
6. Isi bank yang digunakan dan tanggal transfer
7. Klik **"Submit Payment"**
8. Tunggu approval admin (maksimal 1x24 jam)

### 3. Top Up Credit via Referral
1. Masuk ke menu **Referral**
2. Copy referral link atau kode
3. Bagikan ke teman
4. Teman signup menggunakan link Anda
5. Dapatkan credit otomatis saat teman submit pembayaran
6. Credit bisa digunakan untuk subscription

### 4. Transfer Credit ke User Lain
1. Masuk ke menu **Wallet**
2. Klik **"Transfer Credit"**
3. Masukkan email user tujuan
4. Masukkan jumlah credit
5. Konfirmasi transfer

---

## 👨‍💼 Cara Menggunakan (Admin)

### 1. Approve Pembayaran
1. Masuk ke menu **Billing**
2. Pilih tab **"Pending"**
3. Klik pembayaran yang ingin diapprove
4. Lihat detail dan bukti transfer
5. Tambahkan catatan (opsional)
6. Klik **"Approve"**
7. Subscription user otomatis aktif

### 2. Reject Pembayaran
1. Masuk ke menu **Billing**
2. Pilih tab **"Pending"**
3. Klik pembayaran yang ingin direject
4. Masukkan alasan rejection
5. Klik **"Reject"**
6. User akan mendapat notifikasi

### 3. Enable/Disable VPN Access
1. Masuk ke menu **Overview** > **Users**
2. Cari user yang ingin diubah
3. Toggle tombol VPN Access
4. User akan mendapat notifikasi

### 4. Tambah Credit Manual ke User
1. Masuk ke menu **Credit**
2. Cari user yang ingin diberi credit
3. Klik **"Add Credit"**
4. Masukkan jumlah dan deskripsi
5. Konfirmasi

### 5. Kelola Payment Plans
1. Masuk ke menu **Billing** > **Plans**
2. Klik **"Add Plan"**
3. Isi detail plan:
   - Nama plan (contoh: "Monthly Premium")
   - Harga (Rp)
   - Durasi (hari)
   - Status active/inactive
4. Simpan

### 6. Konfigurasi WhatsApp Notification
1. Masuk ke menu **Settings**
2. Pilih tab **"WhatsApp"**
3. Enable WhatsApp notifications
4. Isi API URL dan Session ID
5. Test koneksi dengan kirim pesan test
6. Simpan

---

## 🔐 Role & Permission

### Cara Menjadi Admin
1. Login ke aplikasi
2. Hubungi admin utama
3. Admin akan mengubah role Anda di database
4. Logout dan login kembali
5. Menu admin akan muncul otomatis

### Cek Role Anda
```javascript
// Di browser console (F12)
const { useAuthStore } = await import('./store');
const { userData } = useAuthStore.getState();
console.log('Role:', userData?.role);
console.log('Is Admin:', userData?.role === 'admin');
```

---

## 💰 Payment Plans

| Plan | Harga | Durasi | Hemat |
|------|-------|--------|-------|
| Monthly | Rp 50.000 | 30 hari | - |
| Quarterly | Rp 135.000 | 90 hari | 10% |
| Yearly | Rp 480.000 | 365 hari | 20% |

---

## 🎁 Referral Program

### Tier System
| Tier | Minimal Referral | Multiplier | Bonus |
|------|------------------|------------|-------|
| 🥉 Bronze | 0 | 1x | Rp 10.000/referral |
| 🥈 Silver | 5 | 1.5x | Rp 15.000/referral |
| 🥇 Gold | 20 | 2x | Rp 20.000/referral |
| 💎 Platinum | 50 | 3x | Rp 30.000/referral |

### Cara Kerja
1. Share referral link ke teman
2. Teman signup menggunakan link
3. Teman submit pembayaran pertama
4. Anda dapat credit otomatis
5. Credit bisa ditarik atau digunakan

---

## ⚠️ Troubleshooting

### Menu Admin Tidak Muncul
**Solusi:**
1. Logout dan login kembali
2. Pastikan role Anda sudah diubah jadi admin
3. Clear browser cache (Ctrl+Shift+Delete)
4. Coba incognito mode

### VPN Config Tidak Muncul
**Solusi:**
1. Pastikan VPN Access enabled (cek di Profile)
2. Hubungi admin untuk enable VPN
3. Device sudah mencapai limit (max 3)
4. Delete device yang tidak dipakai

### Pembayaran Pending Lama
**Solusi:**
1. Tunggu maksimal 1x24 jam
2. Hubungi admin via WhatsApp/email
3. Sertakan bukti transfer
4. Admin akan approve manual

### Credit Tidak Masuk
**Solusi:**
1. Cek mutasi credit di Wallet
2. Pastikan referral sudah submit pembayaran
3. Hubungi admin jika ada masalah
4. Sertakan bukti referral

---

## 📞 Kontak Support

- **WhatsApp Admin**: [Link WhatsApp]
- **Email**: support@vpnaccess.local
- **Jam Operasional**: 08:00 - 22:00 WIB

---

## 🔄 Update & Maintenance

### Versi Terbaru: 2.0.0
- ✅ Integrasi API lengkap
- ✅ Auto redirect berdasarkan role
- ✅ Notifikasi real-time
- ✅ Referral tracking otomatis

### Coming Soon
- ⏳ Dark mode
- ⏳ Mobile app (Android/iOS)
- ⏳ Auto payment (QRIS, e-wallet)
- ⏳ Live chat support

---

**Last Updated**: March 2024
