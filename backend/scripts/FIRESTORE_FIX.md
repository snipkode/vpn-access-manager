# Fix Firestore 16 UNAUTHENTICATED Error

## Problem
Firebase Admin SDK can verify tokens but cannot access Firestore.
Error: `16 UNAUTHENTICATED: Request had invalid authentication credentials`

## Root Cause
Service Account lacks Firestore API permissions.

## Solution

### Option 1: Enable Firestore via Google Cloud Console (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **e-landing**
3. Enable Firestore API:
   - Navigate to: **APIs & Services** → **Library**
   - Search for: `Firestore API`
   - Click **Enable**

4. Grant IAM permissions to Service Account:
   - Navigate to: **IAM & Admin** → **IAM**
   - Find: `firebase-adminsdk-fbsvc@e-landing.iam.gserviceaccount.com`
   - Click **Edit** (pencil icon)
   - Add role: **Cloud Datastore User** (`roles/datastore.user`)
   - Click **Save**

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **e-landing**
3. Navigate to: **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key** (if needed)
5. Make sure Firestore is enabled:
   - Navigate to: **Firestore Database**
   - If not enabled, click **Create Database**
   - Choose **Production Mode** or **Test Mode**

### Option 3: Using gcloud CLI

```bash
# Set project
gcloud config set project e-landing

# Enable Firestore API
gcloud services enable firestore.googleapis.com

# Grant Cloud Datastore User role
gcloud projects add-iam-policy-binding e-landing \
  --member="serviceAccount:firebase-adminsdk-fbsvc@e-landing.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

## Verify Fix

Run the test script again:
```bash
node scripts/test-firebase-auth.js <your-token>
```

Expected output:
- ✅ Token verified successfully
- ✅ Firestore connection successful
- ✅ User found in Firestore

## Additional Notes

- Changes may take 1-2 minutes to propagate
- If still failing, try regenerating the Service Account key
- Make sure the Service Account is not disabled
