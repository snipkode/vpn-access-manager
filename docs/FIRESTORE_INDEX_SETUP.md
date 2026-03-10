# Firestore Index Setup for Lease Management

## 🔍 Problem

```
9 FAILED_PRECONDITION: The query requires an index.
```

Query ini membutuhkan composite index:
```javascript
db.collection('devices')
  .where('lease_expires', '<', nowISO)
  .where('status', 'in', ['active', 'pending'])
```

---

## ✅ Solution: Create Firestore Index

### Option 1: Click Link dari Error Log

Firebase sudah menyediakan link langsung untuk create index:

```
https://console.firebase.google.com/v1/r/project/YOUR_PROJECT/firestore/indexes?create_composite=INDEX_CONFIG
```

Click link tersebut dan Firebase akan otomatis configure index.

---

### Option 2: Manual Create via Firebase Console

1. **Go to Firebase Console**
   ```
   https://console.firebase.google.com/
   ```

2. **Select Your Project**
   - Click project: `e-landing` (atau project Anda)

3. **Navigate to Firestore**
   - Left menu: **Firestore Database**
   - Tab: **Indexes**

4. **Create Composite Index**
   - Click **"Add Index"** or **"Create Index"**
   
5. **Configure Index**
   ```
   Collection ID: devices
   
   Fields to index:
   ┌─────────────────┬──────────────┐
   │ Field Path      │ Order        │
   ├─────────────────┼──────────────┤
   │ status          │ Ascending    │
   │ lease_expires   │ Descending   │
   └─────────────────┴──────────────┘
   
   Query scope: Collection
   ```

6. **Save**
   - Click **Save** atau **Create**
   - Wait 1-5 minutes for index to build

---

### Option 3: Using Firebase CLI

```bash
# Install Firebase CLI if not already
npm install -g firebase-tools

# Login
firebase login

# Create index.json file
cat > index.json << 'EOF'
{
  "indexes": [
    {
      "collectionGroup": "devices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "lease_expires",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
EOF

# Deploy index
firebase firestore:indexes --deploy index.json
```

---

## 📋 Index Configuration

### Required Index

| Property | Value |
|----------|-------|
| **Collection** | `devices` |
| **Fields** | `status` (ASC), `lease_expires` (DESC) |
| **Query Scope** | Collection |

### Why This Index?

Query yang digunakan:
```javascript
.where('status', 'in', ['active', 'pending'])  // Filter 1
.where('lease_expires', '<', nowISO)           // Filter 2 (range)
```

- `status` filter dengan `in` operator → butuh index
- `lease_expires` filter dengan range (`<`) → butuh index
- Combination → butuh **composite index**

---

## ⚠️ Fallback Mode (Already Implemented)

Jika index tidak dibuat, code akan otomatis fallback ke manual filtering:

```javascript
try {
  // Try indexed query (fast)
  expiredDevices = await db.collection('devices')
    .where('lease_expires', '<', nowISO)
    .where('status', 'in', ['active', 'pending'])
    .get();
} catch (indexError) {
  // Fallback: Get all and filter manually (slower)
  const allDevices = await db.collection('devices').get();
  const filtered = allDevices.docs.filter(doc => {
    const data = doc.data();
    return (data.status === 'active' || data.status === 'pending') &&
           data.lease_expires && 
           data.lease_expires < nowISO;
  });
}
```

**Trade-offs:**
- ✅ Works without index
- ⚠️ Slower for large datasets (>1000 devices)
- ⚠️ Reads all documents (higher cost)

---

## 🧪 Verify Index is Ready

### Test Query Performance

```javascript
// In browser console or Node.js
const start = Date.now();
const snapshot = await db.collection('devices')
  .where('status', 'in', ['active', 'pending'])
  .where('lease_expires', '<', new Date().toISOString())
  .get();
const end = Date.now();

console.log(`Query took: ${end - start}ms`);
console.log(`Found: ${snapshot.size} devices`);
```

**With Index:** < 100ms
**Without Index (Fallback):** > 500ms (depends on dataset size)

---

## 📊 Monitor Index Usage

Firebase Console → Firestore → Indexes

Look for:
- **Status**: Should be "Enabled" or "Ready"
- **Query Count**: Shows how often index is used
- **Size**: Index size in KB

---

## 🎯 Recommendation

**For Production:**
- ✅ Create the index (better performance, lower cost)
- ✅ Monitor index usage
- ✅ Set up alerts for slow queries

**For Development/Testing:**
- ⚠️ Fallback mode is OK for small datasets
- 📝 Plan to create index before going live

---

## 📝 Summary

**Quick Fix:**
1. Click link dari error log (easiest)
2. Wait 1-5 minutes
3. Restart backend
4. Test cleanup endpoint

**Manual Fix:**
1. Firebase Console → Firestore → Indexes
2. Create composite index: `status` (ASC) + `lease_expires` (DESC)
3. Wait for index to build
4. Test again

**No Fix Needed:**
- Fallback mode already implemented
- Will work without index (just slower)
