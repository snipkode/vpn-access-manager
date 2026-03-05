# 🔐 VPN Access Manager

Sistem manajemen akses WireGuard VPN dengan autentikasi Google Login via Firebase dan kontrol akses melalui admin dashboard.

## 🚀 Fitur

### User
- ✅ Login menggunakan Google
- ✅ Generate konfigurasi VPN (WireGuard)
- ✅ Download file `.conf`
- ✅ Scan QR Code untuk mobile setup
- ✅ Melihat device yang terdaftar
- ✅ Revoke device sendiri

### Admin
- ✅ Toggle akses VPN user
- ✅ Melihat daftar user
- ✅ Melihat daftar device
- ✅ Revoke device user manapun
- ✅ Monitoring statistik koneksi

## 📁 Struktur Project

```
vpn-access/
├── backend/
│   ├── config/
│   │   └── firebase.js        # Firebase Admin setup
│   ├── routes/
│   │   ├── auth.js            # Auth endpoints
│   │   ├── vpn.js             # VPN config endpoints
│   │   └── admin.js           # Admin endpoints
│   ├── services/
│   │   └── wireguard.js       # WireGuard integration
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── components/
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   └── AdminDashboard.js
│   ├── pages/
│   │   └── index.js
│   ├── lib/
│   │   └── firebase.js        # Firebase client setup
│   ├── package.json
│   └── next.config.js
│
├── client/                    # Custom WireGuard Client (Electron)
│   ├── src/
│   │   ├── main.js            # Electron main process
│   │   └── index.html         # Custom UI
│   ├── assets/                # Icons & branding
│   ├── package.json
│   └── BRANDING.md
│
├── mobile/                    # React Native Expo Mobile App
│   ├── app/                   # Expo Router screens
│   │   ├── index.js           # Login screen
│   │   ├── dashboard.js       # User dashboard
│   │   ├── config.js          # VPN config
│   │   ├── devices.js         # Device management
│   │   └── admin.js           # Admin panel
│   ├── src/
│   │   └── config/            # Config & branding
│   ├── assets/                # App icons & splash
│   ├── package.json
│   └── BRANDING.md
│
└── README.md
```

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Firebase SDK
- **Backend**: Node.js, Express.js, Firebase Admin SDK
- **Database**: Firestore
- **VPN**: WireGuard
- **Desktop Client**: Electron (Cross-platform)
- **Mobile App**: React Native + Expo (iOS/Android)

## 🖥️ Custom WireGuard Client

Aplikasi desktop client dengan branding Anda sendiri untuk koneksi VPN yang mudah.

### Fitur Client
- ✅ UI modern dengan dark theme
- ✅ System tray integration
- ✅ Auto-connect on startup
- ✅ Import .conf file
- ✅ Connect/Disconnect dengan satu klik
- ✅ Cross-platform (Windows, macOS, Linux)

### Setup Client

```bash
cd client
npm install

# Run development
npm start

# Build untuk distribusi
npm run build
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

📖 Lihat [client/BRANDING.md](client/BRANDING.md) untuk panduan custom branding lengkap.

## 📱 Mobile App (React Native Expo)

Aplikasi mobile untuk iOS dan Android dengan branding Anda.

### Fitur Mobile
- ✅ Login dengan Google
- ✅ Generate VPN configuration
- ✅ QR Code untuk desktop setup
- ✅ Download/share .conf file
- ✅ Manage devices
- ✅ Admin dashboard
- ✅ Fully customizable branding

### Setup Mobile

```bash
cd mobile
npm install
cp .env.example .env

# Run development
npm start

# Build untuk production
eas build --platform android
eas build --platform ios
```

📖 Lihat [mobile/BRANDING.md](mobile/BRANDING.md) untuk panduan custom branding lengkap.

## 📦 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd vpn-access
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` dengan konfigurasi Anda:

```env
PORT=3000

# Firebase Admin SDK (dari Firebase Service Account)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# WireGuard Config
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=your-server-public-key
WG_SERVER_ENDPOINT=your-server-ip:51820
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/24
```

### 3. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env` dengan konfigurasi Firebase Anda:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 🔥 Firebase Setup

### 1. Buat Project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Buat project baru
3. Enable **Authentication** → **Google Sign-in**
4. Enable **Firestore Database**

### 2. Setup Firebase Admin SDK

1. Buka **Project Settings** → **Service Accounts**
2. Klik **Generate New Private Key**
3. Simpan file JSON dan ambil:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### 3. Setup Firebase Client SDK

1. Buka **Project Settings** → **General**
2. Scroll ke **Your apps** → **Web**
3. Register app dan copy config ke `frontend/.env`

## 🌐 WireGuard Setup

### 1. Install WireGuard

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install wireguard
```

### 2. Generate Server Keys

```bash
cd /etc/wireguard
wg genkey | tee privatekey | wg pubkey > publickey
```

### 3. Buat Konfigurasi Server

Edit `/etc/wireguard/wg0.conf`:

```ini
[Interface]
PrivateKey = <server-private-key>
Address = 10.0.0.1/24
ListenPort = 51820
DNS = 1.1.1.1

[Peer]
# Peer akan ditambahkan otomatis oleh backend
```

### 4. Jalankan WireGuard

```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

## 🏃‍♂️ Menjalankan Aplikasi

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

Backend akan berjalan di `http://localhost:3000`

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Frontend akan berjalan di `http://localhost:3001`

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/verify` | Verify Firebase token |
| GET | `/api/auth/me` | Get current user info |

### VPN

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vpn/generate` | Generate VPN config |
| GET | `/api/vpn/devices` | Get user devices |
| DELETE | `/api/vpn/device/:id` | Revoke own device |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get all users |
| PATCH | `/api/admin/users/:id` | Toggle VPN access |
| GET | `/api/admin/devices` | Get all devices |
| DELETE | `/api/admin/device/:id` | Revoke device |
| GET | `/api/admin/stats` | Get VPN statistics |

## 🔒 Security Best Practices

1. **Gunakan HTTPS** untuk production
2. **Batasi device** per user (max 3)
3. **Log aktivitas** VPN
4. **Gunakan firewall** untuk batasi akses
5. **Rotate keys** secara berkala
6. **Simpan private keys** dengan aman

## 📊 Firestore Collections

### users

```javascript
{
  firebase_uid: string,
  email: string,
  role: 'user' | 'admin',
  vpn_enabled: boolean,
  created_at: timestamp
}
```

### devices

```javascript
{
  user_id: string,
  device_name: string,
  public_key: string,
  private_key: string,
  ip_address: string,
  status: 'active' | 'revoked',
  created_at: timestamp
}
```

## 🎯 Cara Menggunakan

### Untuk User

**Via Web Portal:**
1. Buka aplikasi dan login dengan Google
2. Masukkan nama device
3. Klik **Generate Configuration**
4. Download file `.conf` atau scan QR code
5. Import ke WireGuard client atau VPN Access Client

**Via Desktop Client:**
1. Install dan buka VPN Access Client
2. Klik **Import Config** dan pilih file `.conf`
3. Klik **Connect** untuk terhubung ke VPN
4. Status koneksi ditampilkan di system tray

**Via Mobile App:**
1. Download app dari App Store / Google Play
2. Login dengan Google
3. Generate atau import konfigurasi VPN
4. Scan QR code atau download .conf file
5. Connect menggunakan WireGuard app

### Untuk Admin

1. Login dengan akun admin
2. Buka tab **Users** untuk manage akses
3. Toggle VPN access untuk enable/disable
4. Buka tab **Devices** untuk melihat semua device
5. Revoke device jika diperlukan

## 🚧 Future Features

- [x] Custom WireGuard Desktop Client
- [x] Mobile apps (iOS/Android)
- [ ] Device limit per user (configurable)
- [ ] VPN usage analytics
- [ ] Auto expiry access
- [ ] Multi VPN server support
- [ ] Bandwidth monitoring
- [ ] Billing subscription system
- [ ] Device fingerprinting
- [ ] Email notifications
- [ ] Split tunneling support

## 📝 License

MIT License

---

**Dibuat dengan ❤️ untuk secure VPN access management**
