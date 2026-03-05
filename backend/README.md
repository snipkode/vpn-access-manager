# VPN Access Backend

VPN Access Manager built with Node.js, Express, Firebase, and WireGuard.

## Features

- 🔐 Firebase Authentication
- 📱 WireGuard VPN configuration generation
- 📊 Admin panel for user management
- 🔄 QR Code generation for easy client setup
- 🛡️ Role-based access control (Admin/User)
- 📱 Multi-device support (max 3 devices per user)

## Prerequisites

- Node.js 18+ 
- npm
- Linux server (Ubuntu, Debian, CentOS, RHEL, Fedora, AlmaLinux, or Rocky)
- Root/sudo access
- Firebase project with Admin SDK credentials

## Installation

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Firebase Admin SDK (from your service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# WireGuard (auto-configured by setup script)
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=your-server-public-key
WG_SERVER_ENDPOINT=your-server-ip:51820
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/24
```

### 3. Quick Setup (Recommended)

Automatically configure WireGuard with a single command:

```bash
sudo npm run setup:vpn
```

This script will:
- ✅ Install WireGuard if not present
- ✅ Generate WireGuard keypair
- ✅ Auto-detect server public IP
- ✅ Configure firewall (UFW/firewalld)
- ✅ Enable IP forwarding
- ✅ Create WireGuard config at `/etc/wireguard/wg0.conf`
- ✅ Update `.env` with server credentials
- ✅ Backup existing configurations
- ✅ Start WireGuard service

**Log file:** `logs/setup-wireguard.log`

### 4. Manual WireGuard Setup (Alternative)

If you prefer manual setup:

```bash
# Install WireGuard
sudo apt update && sudo apt install -y wireguard

# Generate keypair
wg genkey | sudo tee /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key

# Get public key
cat /etc/wireguard/public.key

# Create config
sudo nano /etc/wireguard/wg0.conf
```

Example `/etc/wireguard/wg0.conf`:
```ini
[Interface]
PrivateKey = <your-private-key>
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

### 5. Enable IP Forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-wireguard.conf
```

### 6. Configure Firewall

```bash
# UFW
sudo ufw allow 51820/udp

# OR firewalld
sudo firewall-cmd --permanent --add-port=51820/udp
sudo firewall-cmd --reload
```

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/verify` | Verify Firebase token & get/create user | No |
| GET | `/api/auth/me` | Get current user info | Yes |

### VPN Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/vpn/generate` | Generate VPN config for device | Yes |
| GET | `/api/vpn/devices` | List user's devices | Yes |
| DELETE | `/api/vpn/device/:id` | Revoke own device | Yes |

### Admin Only

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | Admin |
| GET | `/api/admin/users/:id` | Get user details | Admin |
| PATCH | `/api/admin/users/:id` | Toggle VPN access | Admin |
| GET | `/api/admin/devices` | List all devices | Admin |
| DELETE | `/api/admin/device/:id` | Revoke any device | Admin |
| GET | `/api/admin/stats` | Get VPN statistics | Admin |

## User Roles

### Admin User
- Stored in Firestore `users` collection
- Field: `role: "admin"`
- Default new users: `role: "user"`

### Create Admin User

Via Firebase Console → Firestore:
1. Go to `users` collection
2. Find user document by UID
3. Set `role` field to `"admin"`
4. Set `vpn_enabled` to `true`

Or via script:
```javascript
db.collection('users').doc('USER_UID').update({
  role: 'admin',
  vpn_enabled: true
});
```

## Firestore Collections

### users
```javascript
{
  email: string,
  firebase_uid: string,
  role: "user" | "admin",
  vpn_enabled: boolean,
  created_at: string (ISO date)
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
  status: "active" | "revoked",
  created_at: string (ISO date)
}
```

## Project Structure

```
backend/
├── config/
│   └── firebase.js       # Firebase Admin SDK initialization
├── routes/
│   ├── admin.js          # Admin-only endpoints
│   ├── auth.js           # Authentication endpoints
│   └── vpn.js            # VPN management endpoints
├── services/
│   └── wireguard.js      # WireGuard operations
├── scripts/
│   └── setup-wireguard.js # Automated setup script
├── logs/
│   └── setup-wireguard.log # Setup logs
├── .env                  # Environment variables (gitignored)
├── .env.example          # Example environment file
├── server.js             # Main entry point
└── package.json
```

## Troubleshooting

### WireGuard won't start

```bash
# Check config syntax
sudo wg-quick strip wg0

# Check logs
journalctl -u wg-quick@wg0
cat logs/setup-wireguard.log
```

### Port 51820 already in use

```bash
# Find process using the port
sudo ss -tuln | grep 51820
sudo netstat -tuln | grep 51820

# Kill the process or change port in config
```

### IP forwarding not working

```bash
# Check current status
sysctl net.ipv4.ip_forward

# Enable temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Enable permanently
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-wireguard.conf
sudo sysctl -p /etc/sysctl.d/99-wireguard.conf
```

### Firewall blocking connections

```bash
# Check UFW status
sudo ufw status

# Check firewalld status
sudo firewall-cmd --list-all

# Ensure 51820/UDP is allowed
sudo ufw allow 51820/udp
# OR
sudo firewall-cmd --permanent --add-port=51820/udp && sudo firewall-cmd --reload
```

### Rollback Setup

If setup fails, the script creates backups:
- `/etc/wireguard/wg0.conf.backup.*`
- `.env.backup.*`

To restore:
```bash
sudo cp /etc/wireguard/wg0.conf.backup.<timestamp> /etc/wireguard/wg0.conf
cp .env.backup.<timestamp> .env
```

## Security Notes

- 🔒 Keep `.env` file secure (never commit to git)
- 🔒 Store private keys securely
- 🔒 Use HTTPS in production
- 🔒 Restrict firewall access to necessary ports only
- 🔒 Regular security updates

## License

MIT
