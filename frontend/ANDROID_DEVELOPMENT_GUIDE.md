# 🤖 Android Development Guide

## ⚠️ Build Issues on Android (Termux)

Next.js 14 menggunakan **SWC** (Rust-based compiler) yang **tidak kompatibel** dengan Android ARM64.

---

## ✅ Recommended Solution: Use Dev Mode

**Jangan build production di Android!** Gunakan development mode saja.

### Quick Start
```bash
cd frontend
npm run dev
```

Akses: `http://localhost:3000`

---

## 🔧 Alternative Solutions

### Option 1: Interactive Script (RECOMMENDED)
```bash
cd frontend
./build-android.sh
```

Script ini memberikan 3 pilihan:
1. **Development mode** ← Pilih ini!
2. Try production build (mungkin gagal)
3. Clean and rebuild

---

### Option 2: Manual Development
```bash
cd frontend

# Set environment
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=2048"

# Run dev mode
npm run dev
```

---

### Option 3: Disable SWC (If Build Required)
```bash
cd frontend

# Clean cache
rm -rf .next node_modules/.cache .eslintcache

# Try build with env variables
NEXT_TELEMETRY_DISABLED=1 \
DISABLE_SWC_MINIFY=true \
npm run build
```

---

## 📊 Comparison

| Mode | Speed | Android Compatible | Recommended |
|------|-------|-------------------|-------------|
| **Dev Mode** | Fast | ✅ Yes | ✅ **YES** |
| **Production Build** | Slow | ❌ No | ❌ No |

---

## 🎯 Why Dev Mode is Better on Android

### Advantages
- ✅ No SWC required
- ✅ Faster startup
- ✅ Hot reload works
- ✅ Less memory usage
- ✅ No build step needed

### Disadvantages
- ⚠️ Larger bundle size
- ⚠️ Not optimized
- ⚠️ Slower page load (but acceptable for dev)

---

## 🔧 Configuration

### next.config.js (Already Updated)
```javascript
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,  // Disable SWC
  
  // Disable webpack caching
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};
```

### Environment Variables
Create `.env.local`:
```bash
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048
```

---

## 📝 Development Workflow

### 1. Start Development
```bash
cd frontend
npm run dev
```

### 2. Make Changes
- Edit files in `components/`
- Changes auto-reload
- No build needed!

### 3. Test Features
- Login
- Dashboard
- Admin panel
- All features work in dev mode

### 4. Production Deployment
**Deploy dari server lain (bukan Android):**
```bash
# Di production server (Linux x64 / VPS)
git clone <repository>
cd frontend
npm install
npm run build  # ✓ Works on x64
npm start
```

---

## 🚫 Common Build Errors on Android

### Error 1: SWC Not Found
```
⚠ Attempted to load @next/swc-android-arm64
✗ Failed to load SWC binary
```
**Fix:** Use dev mode instead

### Error 2: Webpack Cache
```
[webpack.cache.PackFileCacheStrategy] Caching failed
```
**Fix:** 
```bash
rm -rf .next
npm run dev
```

### Error 3: Out of Memory
```
JavaScript heap out of memory
```
**Fix:**
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
```

---

## 🎯 Best Practices for Android Development

### 1. Use Dev Mode Only
```bash
npm run dev  # ✓ Good
npm run build  # ✗ Avoid
```

### 2. Clean Cache Regularly
```bash
rm -rf .next
```

### 3. Limit Memory Usage
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
```

### 4. Use Lightweight Editor
- VS Code (remote SSH)
- Vim / Neovim
- Nano

### 5. Monitor Resources
```bash
# Check memory
free -h

# Check CPU
top

# Check storage
df -h
```

---

## 📦 Production Deployment

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

### Deploy to VPS
```bash
# On VPS (not Android!)
cd /var/www/vpn-access/frontend
npm install
npm run build
npm start
```

### Deploy to Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🧪 Testing Checklist

### Development Mode
- [ ] `npm run dev` starts successfully
- [ ] Can access `http://localhost:3000`
- [ ] Login works
- [ ] Dashboard loads
- [ ] Hot reload works
- [ ] No console errors

### Features to Test
- [ ] User authentication
- [ ] VPN device management
- [ ] Payment submission
- [ ] Admin dashboard
- [ ] All admin features

---

## 📞 Troubleshooting

### Problem: Dev Mode Slow
**Solution:**
```bash
# Increase memory
export NODE_OPTIONS="--max-old-space-size=3072"

# Disable telemetry
export NEXT_TELEMETRY_DISABLED=1
```

### Problem: Port Already in Use
**Solution:**
```bash
# Use different port
PORT=3001 npm run dev
```

### Problem: Module Not Found
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## ✅ Quick Reference

### Start Development
```bash
cd frontend
npm run dev
```

### Interactive Script
```bash
./build-android.sh
# Choose option 1
```

### Clean Cache
```bash
rm -rf .next
rm -rf node_modules/.cache
```

### Check Status
```bash
# Node version
node --version  # Should be 18+

# npm version
npm --version  # Should be 9+

# Available memory
free -h  # Should have 2GB+ free
```

---

## 🎉 Summary

**For Android Development:**
1. ✅ Use `npm run dev`
2. ✅ Avoid `npm run build`
3. ✅ Clean cache regularly
4. ✅ Use interactive script: `./build-android.sh`

**For Production:**
1. ✅ Deploy from x64 server
2. ✅ Use Vercel or VPS
3. ✅ Build on compatible platform

---

**Status:** ✅ WORKAROUND AVAILABLE  
**Recommended:** Development Mode  
**Production:** Build on x64 Server  
**Android Compatible:** Dev Mode Only  

**Last Updated:** March 6, 2026
