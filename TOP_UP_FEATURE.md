# Top Up Feature - Complete Implementation Guide

## 📋 Overview

Fitur Top Up memungkinkan user untuk menambahkan credit balance dengan upload bukti transfer. Top up request akan di-approve oleh admin dan credit akan ditambahkan ke balance user.

---

## 🎯 Features

### **User Features:**
- ✅ Submit top up request dengan bukti transfer
- ✅ View bank accounts untuk transfer
- ✅ Top up history dengan status tracking
- ✅ Credit transactions history
- ✅ File upload (image/PDF, max 5MB)
- ✅ Real-time balance display

### **Admin Features:**
- ✅ View pending top up requests
- ✅ Approve/reject top up requests
- ✅ Add admin notes
- ✅ Auto credit balance update on approval

---

## 🔄 Flow

```
User Flow:
1. User selects Top Up tab
2. Views bank account info
3. Fills top up form:
   - Amount
   - Bank used
   - Transfer date
   - Upload proof
4. Submits request
5. Request status: Pending
6. Admin approves
7. Credit added to balance

Admin Flow:
1. Admin views pending top ups
2. Reviews proof of transfer
3. Approves or rejects
4. If approved: credit auto-added
5. User notified
```

---

## 📱 UI Components

### **Wallet.js - Tabs:**

1. **Top Up Tab**
   - Bank accounts display
   - Top up form
   - File upload with preview
   - Submit button

2. **Topup History Tab**
   - List of submitted top ups
   - Status badges (Pending/Approved/Rejected)
   - Admin notes display

3. **Transactions Tab**
   - Credit transactions
   - Balance changes
   - Transaction types

---

## 🧪 Testing Guide

### **Test 1: Submit Top Up**

1. **Login sebagai user**
2. **Navigate to Wallet**
3. **Click "Top Up" tab**

4. **Fill form:**
   ```
   Amount: 50000
   Bank Used: BCA
   Transfer Date: Today
   Proof: Upload screenshot
   Notes: Top up for subscription
   ```

5. **Click "Submit Top Up Request"**
   - Expected: Success notification
   - Expected: Redirect to History tab

6. **Check History:**
   - Top up appears with "Pending" status

---

### **Test 2: Admin Approval**

1. **Login sebagai admin**
2. **Navigate to Admin Credit**
3. **View pending top ups**
4. **Click "Approve" on top up**
5. **Add admin note (optional)**
6. **Click "Approve Payment"**
   - Expected: Success notification
   - Expected: Status changes to "Approved"
   - Expected: User credit balance updated

---

### **Test 3: View Balance Update**

1. **Login sebagai user (same user)**
2. **Navigate to Wallet**
3. **Check balance card**
   - Expected: Balance increased by approved amount
4. **Check Transactions tab**
   - Expected: New transaction with type "topup"

---

## 🔍 API Endpoints

### **Submit Top Up:**

```bash
POST /api/billing/submit
Authorization: Bearer <user-token>
Content-Type: multipart/form-data

FormData:
- amount: "50000"
- bank_from: "BCA"
- transfer_date: "2024-01-15"
- notes: "Top up for subscription"
- proof: <file>
```

**Response:**
```json
{
  "message": "Payment proof submitted successfully",
  "payment": {
    "id": "payment_id",
    "amount": 50000,
    "status": "pending",
    "created_at": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### **Get Topup History:**

```bash
GET /api/billing/payments?limit=10
Authorization: Bearer <user-token>
```

**Response:**
```json
{
  "payments": [
    {
      "id": "payment_id",
      "amount": 50000,
      "status": "pending",
      "bank_from": "BCA",
      "transfer_date": "2024-01-15T00:00:00.000Z",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### **Approve Top Up (Admin):**

```bash
POST /api/admin/billing/payments/:id/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "admin_note": "Payment verified"
}
```

**Response:**
```json
{
  "message": "Payment approved successfully"
}
```

---

## 📊 Database Structure

### **payments Collection:**

```javascript
{
  user_id: "user_uid",
  amount: 50000,
  plan: "topup", // or monthly/quarterly/yearly
  plan_label: "Top Up",
  duration_days: 0,
  bank_from: "BCA",
  transfer_date: "2024-01-15T00:00:00.000Z",
  proof_image_url: "/uploads/proofs/proof-123.jpg",
  proof_filename: "proof-123.jpg",
  status: "pending", // pending/approved/rejected
  notes: "Top up for subscription",
  admin_note: "",
  approved_by: null, // admin uid when approved
  approved_at: null,
  created_at: "2024-01-15T10:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z"
}
```

### **credit_transactions Collection:**

```javascript
{
  user_id: "user_uid",
  type: "topup",
  amount: 50000,
  status: "completed",
  description: "Top up approved",
  related_payment_id: "payment_id",
  created_at: "2024-01-15T10:00:00.000Z"
}
```

---

## 🎨 UI States

### **Top Up Form:**

```javascript
// Initial state
amount: 50000
bankFrom: ''
transferDate: ''
notes: ''
proofFile: null
proofPreview: null

// After file upload
proofPreview: 'data:image/jpeg;base64,...' // for images
proofPreview: null // for PDFs

// After submit
submitting: true
// Show loading spinner
```

### **Status Badges:**

```javascript
pending:   'bg-amber-100 text-amber-700'
approved:  'bg-green-100 text-green-700'
rejected:  'bg-red-100 text-red-700'
blocked:   'bg-purple-100 text-purple-700'
```

---

## ⚠️ Validation Rules

### **Amount:**
- Minimum: Rp 10,000
- Step: Rp 10,000
- Must be integer

### **File Upload:**
- Allowed types: JPEG, JPG, PNG, PDF
- Max size: 5MB
- Required field

### **Transfer Date:**
- Required field
- Must be valid date format
- Cannot be future date (optional validation)

---

## 🐛 Troubleshooting

### **Top Up Not Submitting:**

**Error:** "Proof of transfer is required"

**Solutions:**
1. Ensure file is selected
2. Check file type (JPEG/PNG/PDF only)
3. Check file size (< 5MB)
4. Verify bank accounts are loaded

---

### **Balance Not Updating:**

**Issue:** Admin approved but balance unchanged

**Solutions:**
1. Check if credit transaction was created
2. Verify admin approval flow
3. Refresh page to fetch latest balance
4. Check Firestore for transaction record

---

### **File Preview Not Showing:**

**Issue:** PDF files don't show preview

**Solution:** This is expected - PDFs show file icon instead of image preview

---

## ✅ Verification Checklist

### **User Side:**
- [ ] Top Up tab displays correctly
- [ ] Bank accounts are shown
- [ ] Form validation works
- [ ] File upload works
- [ ] File preview works (for images)
- [ ] Submit shows loading state
- [ ] Success notification appears
- [ ] Redirect to History tab
- [ ] Top up appears in history
- [ ] Status badge shows "Pending"

### **Admin Side:**
- [ ] Pending top ups visible
- [ ] Approve button works
- [ ] Reject button works
- [ ] Admin note can be added
- [ ] Success notification appears
- [ ] Status updates correctly

### **Post-Approval:**
- [ ] User balance updated
- [ ] Transaction appears in Transactions tab
- [ ] Status changes to "Approved"
- [ ] Admin note visible

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `frontend/components/Wallet.js` | ✅ Complete rewrite with Top Up feature |
| `backend/routes/billing.js` | ✅ Already has submit endpoint |
| `backend/routes/admin-billing.js` | ✅ Already has approve/reject endpoints |

---

## 🎯 Next Steps

1. **Test top up submission**
2. **Test admin approval**
3. **Verify balance updates**
4. **Test file upload validation**
5. **Test error handling**

---

## 🚀 Quick Start

### **User:**
```
1. Login
2. Go to Wallet
3. Click "Top Up" tab
4. Fill form
5. Upload proof
6. Submit
7. Wait for admin approval
```

### **Admin:**
```
1. Login as admin
2. Go to Admin Credit
3. View pending top ups
4. Review proof
5. Approve or Reject
6. Add note (optional)
```

---

**Status:** ✅ COMPLETE - Top Up feature fully implemented
**Last Updated:** 2026-03-07
