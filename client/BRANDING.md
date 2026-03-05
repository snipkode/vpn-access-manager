# 🎨 VPN Access Client - Branding Assets Guide

## Logo & Icon Requirements

Untuk build aplikasi Electron, Anda perlu menyiapkan file icon berikut:

### Required Icon Files

Simpan di folder `client/assets/`:

```
assets/
├── icon.png          # 512x512 px - Main icon
├── icon.ico          # Multi-size - Windows icon
├── icon.icns         # Multi-size - macOS icon
└── tray-icon.png     # 32x32 px - System tray icon
```

### Icon Specifications

| Platform | Format | Sizes | Notes |
|----------|--------|-------|-------|
| Windows | `.ico` | 16, 32, 48, 256 px | Use multi-size ICO |
| macOS | `.icns` | 16-1024 px | Use iconutil |
| Linux | `.png` | 512x512 px | Standard PNG |
| Tray | `.png` | 16-32 px | Transparent background |

### Membuat Icon

**Dari PNG ke ICO (Windows):**
```bash
# Online: https://convertio.co/png-ico/
# Or use ImageMagick:
convert icon.png -define icon:auto-resize=256,48,32,16 icon.ico
```

**Dari PNG to ICNS (macOS):**
```bash
mkdir icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
```

## Color Scheme

Aplikasi menggunakan color scheme modern dark theme:

```css
--bg-primary: #0f172a    /* Main background */
--bg-secondary: #1e293b  /* Cards, sections */
--bg-tertiary: #334155   /* Borders, accents */
--text-primary: #f1f5f9  /* Primary text */
--text-secondary: #94a3b8 /* Secondary text */
--accent: #3b82f6        /* Blue accent */
--success: #10b981       /* Connected state */
--danger: #ef4444        /* Error, disconnect */
```

## Custom Branding

### Mengganti Nama Aplikasi

Edit `client/package.json`:

```json
{
  "name": "your-vpn-client",
  "productName": "Your VPN Client",
  "build": {
    "appId": "com.yourcompany.vpn-client"
  }
}
```

### Mengganti Logo di UI

Edit `client/src/index.html`, cari bagian logo:

```html
<div class="logo">
  <span class="logo-icon">🔐</span>
  <span class="logo-text">Your <span>Brand</span></span>
</div>
```

### Mengganti Icon SVG

Anda bisa mengganti emoji dengan SVG logo:

```html
<div class="logo">
  <svg class="logo-icon" viewBox="0 0 24 24">
    <!-- Your SVG logo here -->
  </svg>
  <span class="logo-text">Your Brand</span>
</div>
```

### Footer Link

Edit footer di `index.html`:

```html
<div class="footer">
  Your VPN Client v1.0.0 | <a href="#" onclick="openWebsite()">your-website.com</a>
</div>
```

## Build Instructions

### Install Dependencies

```bash
cd client
npm install
```

### Build untuk Semua Platform

```bash
npm run build
```

### Build untuk Platform Spesifik

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### Output Files

Build files akan ada di `client/build/`:

- **Windows**: `.exe` installer
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage`, `.deb`

## WireGuard Prerequisites

Aplikasi ini memerlukan WireGuard terinstall di sistem:

### Windows
Download dari: https://www.wireguard.com/install/

### macOS
```bash
brew install wireguard-tools
```

### Linux
```bash
sudo apt install wireguard
```

## Distribusi

### Code Signing (Recommended)

Untuk distribusi production, sign aplikasi Anda:

**Windows:**
```json
"build": {
  "win": {
    "sign": "path/to/signing-script.js"
  }
}
```

**macOS:**
```json
"build": {
  "mac": {
    "identity": "Your Developer ID"
  }
}
```

## License

MIT License - VPN Access Client
