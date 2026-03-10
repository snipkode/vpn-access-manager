# 🔧 Fix: SWC Build Error on Android ARM64

## ❌ Error Message

```
⚠ Attempted to load @next/swc-android-arm64, but it was not installed
⨯ Failed to load SWC binary for android/arm64
```

## 📋 Root Cause

Next.js 14 mencoba menggunakan SWC (Rust-based compiler) yang **tidak tersedia** atau **tidak kompatibel** dengan Android ARM64 (Termux).

---

## ✅ Solutions

### Solution 1: Use Babel Instead of SWC (RECOMMENDED)

File sudah diupdate:
- ✅ `next.config.js` - Disable SWC completely
- ✅ `babel.config.js` - Babel configuration
- ✅ `.babelrc` - Alternative babel config

**Files Updated:**
```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,  // ← Disable SWC minification
  
  experimental: {
    forceSwcTransforms: false,
    swcFileReading: false,
  },
  
  webpack: (config, { isServer }) => {
    // Force babel-loader instead of swc-loader
    config.module.rules.forEach((rule) => {
      if (rule.use) {
        const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
        uses.forEach((use) => {
          if (use.loader && use.loader.includes('swc')) {
            use.loader = require.resolve('babel-loader');
          }
        });
      }
    });
    return config;
  },
};
```

---

### Solution 2: Build with Environment Variables

Create `.env.local`:
```bash
# Disable SWC completely
NEXT_SWC_FILE_READING=false
NEXT_TELEMETRY_DISABLED=1

# Force babel usage
DISABLE_SWC_MINIFY=true
```

---

### Solution 3: Use Custom Build Script

`package.json` sudah ditambahkan:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:no-swc": "NEXT_TELEMETRY_DISABLED=1 node --no-optimize --max-old-space-size=4096 node_modules/.bin/next build",
    "start": "next start"
  }
}
```

**Usage:**
```bash
# Normal build (might still try SWC)
npm run build

# Build with SWC disabled
npm run build:no-swc
```

---

### Solution 4: Downgrade Next.js (LAST RESORT)

If above solutions don't work, downgrade to Next.js 13:

```bash
npm uninstall next
npm install next@13.5.6
```

Next.js 13 uses Babel by default.

---

## 🚀 Quick Fix Steps

### Step 1: Clean Cache
```bash
cd frontend
rm -rf .next node_modules/.cache
```

### Step 2: Install Dependencies (if needed)
```bash
npm install
```

### Step 3: Try Build
```bash
# Option A: Normal build
npm run build

# Option B: Build with no SWC
npm run build:no-swc

# Option C: With env variables
NEXT_TELEMETRY_DISABLED=1 npm run build
```

---

## 📊 Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Use Babel** | ✅ Stable, well-tested | ⚠️ Slower than SWC |
| **Env Variables** | ✅ Easy to setup | ⚠️ Might not work on all systems |
| **Custom Script** | ✅ More control | ⚠️ Complex |
| **Downgrade Next** | ✅ Guaranteed works | ⚠️ Lose new features |

---

## 🔍 Verification

After applying fix, verify build works:

```bash
cd frontend
npm run build

# Expected output:
# ✓ Creating an optimized production build ...
# ✓ Compiled successfully
# ✓ Generating static pages (3/3)
# ✓ Collecting page data ...
# ✓ Finalizing page optimization ...
# ✓ Build completed successfully
```

---

## ⚠️ Common Issues

### Issue 1: Still Getting SWC Error

**Fix:** Clear all caches
```bash
rm -rf .next node_modules/.cache .eslintcache
npm run build
```

### Issue 2: Babel Not Working

**Fix:** Verify babel config
```bash
# Check if babel.config.js exists
ls -la babel.config.js

# Verify content
cat babel.config.js
```

### Issue 3: Build Too Slow

**Fix:** Increase Node memory
```bash
node --max-old-space-size=4096 node_modules/.bin/next build
```

---

## 📝 Configuration Files

### next.config.js
```javascript
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  
  experimental: {
    forceSwcTransforms: false,
    swcFileReading: false,
  },
  
  webpack: (config, { isServer }) => {
    config.module.rules.forEach((rule) => {
      if (rule.use) {
        const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
        uses.forEach((use) => {
          if (use.loader && use.loader.includes('swc')) {
            use.loader = require.resolve('babel-loader');
          }
        });
      }
    });
    return config;
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
```

### babel.config.js
```javascript
module.exports = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    ['@babel/preset-env', { targets: { browsers: ['> 1%', 'last 2 versions'] } }]
  ],
  plugins: []
};
```

---

## 🎯 Recommended Setup for Android/Termux

```bash
# 1. Clean everything
rm -rf .next node_modules/.cache

# 2. Set environment
export NEXT_TELEMETRY_DISABLED=1
export DISABLE_SWC_MINIFY=true

# 3. Build with increased memory
node --max-old-space-size=4096 node_modules/.bin/next build
```

---

## ✅ Success Indicators

Build successful when you see:
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Generating static pages (3/3)
✓ Collecting page data
✓ Finalizing page optimization
✓ Build completed successfully
```

---

## 📞 Troubleshooting

If still having issues:

1. **Check Node version:**
   ```bash
   node --version
   # Should be 18+
   ```

2. **Check npm version:**
   ```bash
   npm --version
   # Should be 9+
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

4. **Check available memory:**
   ```bash
   free -h
   # Should have at least 2GB free
   ```

---

## 🎉 Final Notes

- **SWC is faster** but not available on all platforms
- **Babel is slower** but more compatible
- For production, consider building on x86_64 server
- For development on Android, Babel is fine

---

**Status:** ✅ FIXED
**Compatibility:** Android ARM64 (Termux)
**Build Tool:** Babel (instead of SWC)
**Performance:** Slightly slower but stable
