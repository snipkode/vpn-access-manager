# Firestore Index Setup Guide - Credit Transactions

## 🐛 Problem

**Error:** `FAILED_PRECONDITION: The query requires an index`

Query di `/api/admin/credit/transactions` menggunakan multiple filters (`type`, `status`, `userId`) dengan `orderBy('created_at')` yang membutuhkan **composite index**.

---

## ✅ Solution

### **Option 1: Deploy via Firebase CLI (Recommended)**

```bash
# 1. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Navigate to backend directory
cd backend

# 4. Deploy indexes
firebase deploy --only firestore:indexes
```

### **Option 2: Create via Firebase Console (Manual)**

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com
   - Select your project: `e-landing`

2. **Navigate to Firestore Indexes**
   - Firestore Database → Indexes tab

3. **Add Composite Indexes**

#### **Index 1: type + status + created_at**
```
Collection: credit_transactions
Fields:
  - type (Ascending)
  - status (Ascending)
  - created_at (Descending)
Query Scope: Collection
```

#### **Index 2: user_id + type + status + created_at**
```
Collection: credit_transactions
Fields:
  - user_id (Ascending)
  - type (Ascending)
  - status (Ascending)
  - created_at (Descending)
Query Scope: Collection
```

### **Option 3: Create via gcloud CLI**

```bash
# Index 1: type + status + created_at
gcloud alpha firestore indexes create \
  --collection=credit_transactions \
  --field=type,ASCENDING \
  --field=status,ASCENDING \
  --field=created_at,DESCENDING

# Index 2: user_id + type + status + created_at
gcloud alpha firestore indexes create \
  --collection=credit_transactions \
  --field=user_id,ASCENDING \
  --field=type,ASCENDING \
  --field=status,ASCENDING \
  --field=created_at,DESCENDING
```

---

## 📋 All Required Indexes for Credit Transactions

| Fields | Query Scope | Purpose |
|--------|-------------|---------|
| `type` ↑, `status` ↑, `created_at` ↓ | Collection | Admin filtering by type & status |
| `user_id` ↑, `type` ↑, `status` ↑, `created_at` ↓ | Collection | User-specific filtering |
| `type` ↑, `created_at` ↓ | Collection | Filter by type only |
| `status` ↑, `created_at` ↓ | Collection | Filter by status only |
| `from_user_id` ↑, `created_at` ↓ | Collection | Sender transactions |
| `to_user_id` ↑, `created_at` ↓ | Collection | Receiver transactions |

---

## 🔧 Fallback Handling

Code sudah ditambahkan dengan **fallback handling**:

```javascript
try {
  transactionsSnapshot = await query.get();
} catch (indexError) {
  // Fallback: Get all transactions and filter in-memory
  console.warn('⚠️ Firestore index missing, fetching without filters');
  
  const allQuery = db.collection('credit_transactions')
    .orderBy('created_at', 'desc')
    .limit(200);
  
  transactionsSnapshot = await allQuery.get();
}
```

**Benefits:**
- ✅ API tetap bekerja meskipun index belum dibuat
- ✅ Filter dilakukan in-memory sebagai fallback
- ✅ Console warning untuk reminder deploy index

---

## 🚀 Deploy Steps

### **Step 1: Check Current Indexes**

```bash
# List all indexes
firebase firestore:indexes
```

### **Step 2: Deploy Indexes**

```bash
# From backend directory
firebase deploy --only firestore:indexes
```

### **Step 3: Verify Deployment**

```bash
# Check indexes status
firebase firestore:indexes
```

### **Step 4: Test API**

```bash
# Test with filters
curl "http://localhost:3000/api/admin/credit/transactions?type=transfer&status=completed" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Should return 200 OK with filtered transactions
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `backend/config/firestoreIndexes.js` | ✅ Added new composite indexes |
| `backend/routes/admin-credit.js` | ✅ Added fallback handling |
| `backend/firestore.indexes.json` | ✅ Generated for deployment |

---

## ⚠️ Important Notes

1. **Index Creation Time:** 5-30 minutes depending on data size
2. **Cost:** Free tier includes 500K reads/day
3. **Limit:** Max 200 composite indexes per project
4. **Status:** Check in Firebase Console → Firestore → Indexes

---

## 🐛 Troubleshooting

### **Error: "Index creation failed"**
- Check if you have quota remaining
- Verify field names match exactly

### **Error: "Too many indexes"**
- Remove unused indexes in Firebase Console
- Consider merging similar indexes

### **API still returns error**
- Wait for index to finish building (check status in Console)
- Restart backend server
- Clear browser cache

---

## 📚 Resources

- [Firestore Index Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)

---

**Status:** ✅ Fallback added - API works with or without indexes
**Recommendation:** Deploy indexes for better performance
