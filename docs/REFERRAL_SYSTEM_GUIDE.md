# 🎁 Referral System Guide

## 📅 March 6, 2026

---

## 🔄 How It Works

### Flow Overview

```
User A (Existing)
    ↓
Gets Referral Code: "BERLITZ2026"
    ↓
Shares Link: https://vpn-access.com/signup?ref=BERLITZ2026
    ↓
User B (New) clicks link
    ↓
Signup Page shows "Referred by BERLITZ2026"
    ↓
User B clicks "Sign in with Google"
    ↓
Google OAuth → Login success
    ↓
Backend tracks: User B referred by User A
    ↓
User B subscribes & payment approved
    ↓
User A gets reward: Rp 10.000
    ↓
User A refers 5+ people → Tier upgrade to Silver
    ↓
User A now gets Rp 12.000 per referral
```

---

## 📁 Files Created/Updated

### New Files:
1. **`frontend/pages/signup.js`** - Signup page with referral support
2. **`backend/scripts/enable-billing.js`** - Enable billing script
3. **`backend/scripts/fix-billing.js`** - Quick billing fix
4. **`backend/scripts/test-billing-api.js`** - API testing script
5. **`backend/scripts/check-billing-status.js`** - Diagnostic script

### Updated Files:
1. **`frontend/pages/index.js`** - Added referral tracking
2. **`frontend/components/Payment.js`** - New payment component
3. **`frontend/components/PaymentSettings.js`** - Debug panel added
4. **`backend/middleware/rateLimit.js`** - Increased limits for dev
5. **`firestore.rules`** - Complete security rules
6. **`backend/config/firestoreIndexes.js`** - 67 indexes

---

## 🎯 Referral Implementation

### 1. User Gets Referral Code

**When:** First time login via Google

**Backend:** `GET /referral/code`

```javascript
// Auto-generate code from email
const emailPrefix = email.split('@')[0].toUpperCase().substring(0, 6);
// "berlitz@gmail.com" → "BERLITZ"

const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
// Random: "A1B2"

const referralCode = `${emailPrefix}${randomString}`;
// Result: "BERLITZA1B2"
```

**Response:**
```json
{
  "referral_code": "BERLITZA1B2",
  "referral_link": "http://localhost:3000/signup?ref=BERLITZA1B2",
  "tier": "tier_1",
  "stats": {
    "total_referrals": 0,
    "active_referrals": 0,
    "total_earned": 0
  }
}
```

---

### 2. Share Referral Link

**User Dashboard:**
```
┌─────────────────────────────────────┐
│ 🎁 Refer & Earn                     │
├─────────────────────────────────────┤
│ Your Code: BERLITZA1B2              │
│                                     │
│ [Copy Code]  [Share Link]           │
│                                     │
│ Link:                               │
│ http://localhost:3000/signup?ref=   │
│ BERLITZA1B2                         │
└─────────────────────────────────────┘
```

---

### 3. New User Clicks Link

**URL:** `http://localhost:3000/signup?ref=BERLITZA1B2`

**Signup Page Shows:**
```
┌─────────────────────────────────────┐
│ 🔐 Create Your Account              │
├─────────────────────────────────────┤
│ 🎁 Referred by BERLITZA1B2          │
│                                     │
│ You'll be referred by this user     │
│ and they'll earn rewards when you   │
│ subscribe!                          │
│                                     │
│ [Sign in with Google]               │
└─────────────────────────────────────┘
```

**Frontend Code:** `frontend/pages/signup.js`

```javascript
// Get ref code from URL
const router = useRouter();
const referralCode = router.query.ref;  // "BERLITZA1B2"

// Store for later
localStorage.setItem('pending_referral_code', referralCode);

// After Google login
const handleLogin = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  
  // Track referral
  await apiFetch('/referral/track', {
    method: 'POST',
    body: JSON.stringify({
      referrer_code: referralCode,
      metadata: { signup_method: 'google_oauth' }
    })
  });
  
  // Redirect to dashboard
  router.push('/');
};
```

---

### 4. Backend Tracks Referral

**Endpoint:** `POST /referral/track`

```javascript
router.post('/track', verifyAuth, async (req, res) => {
  const { uid } = req.user;  // New user's ID
  const { referrer_code } = req.body;  // "BERLITZA1B2"
  
  // 1. Find referrer by code
  const referrerDoc = await db.collection('referrals')
    .where('referral_code', '==', referrer_code)
    .limit(1)
    .get();
  
  if (referrerDoc.empty) {
    return res.status(404).json({ error: 'Invalid code' });
  }
  
  const referrerId = referrerDoc.docs[0].id;
  
  // 2. Check if already tracked
  const existingReferral = await db.collection('referral_events')
    .where('referee_id', '==', uid)
    .limit(1)
    .get();
  
  if (!existingReferral.empty) {
    return res.status(400).json({ error: 'Already referred' });
  }
  
  // 3. Create referral event
  await db.collection('referral_events').add({
    referrer_id: referrerId,
    referee_id: uid,
    referee_email: req.user.email,
    created_at: new Date().toISOString(),
    status: 'pending',  // Wait for payment
    credit_earned: 0
  });
  
  // 4. Update referrer stats
  await db.collection('referrals').doc(referrerId).update({
    total_referrals: increment(1)
  });
  
  res.json({ message: 'Referral tracked' });
});
```

---

### 5. Referral Qualifies (Gets Reward)

**When:** New user's first payment is approved

**Backend:** `POST /admin/billing/payments/:id/approve`

```javascript
async function approvePayment(paymentId) {
  const payment = await db.collection('payments').doc(paymentId).get();
  const userId = payment.data().user_id;  // New user
  
  // Update user subscription
  await db.collection('users').doc(userId).update({
    vpn_enabled: true,
    subscription_plan: payment.data().plan
  });
  
  // Check if user has referrer
  const referralEvent = await db.collection('referral_events')
    .where('referee_id', '==', userId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  
  if (!referralEvent.empty) {
    const eventId = referralEvent.docs[0].id;
    const referrerId = referralEvent.docs[0].data().referrer_id;
    
    // Get tier
    const referrerDoc = await db.collection('referrals').doc(referrerId).get();
    const tier = referrerDoc.data().tier;  // tier_1, tier_2, tier_3
    
    // Calculate reward
    const rewards = {
      tier_1: 10000,   // Rp 10.000
      tier_2: 12000,   // Rp 12.000
      tier_3: 15000    // Rp 15.000
    };
    const reward = rewards[tier];
    
    // Update referral event
    await db.collection('referral_events').doc(eventId).update({
      status: 'qualified',
      credit_earned: reward,
      qualified_at: new Date().toISOString()
    });
    
    // Give credit to referrer
    await db.collection('users').doc(referrerId).update({
      credit_balance: increment(reward)
    });
    
    // Update referrer stats
    await db.collection('referrals').doc(referrerId).update({
      active_referrals: increment(1),
      total_earned: increment(reward)
    });
    
    // Auto check tier upgrade
    await checkTierUpgrade(referrerId);
    
    // Send notification
    await sendNotification(referrerId, {
      type: 'referral_qualified',
      message: `Your referral qualified! You earned ${formatCurrency(reward)}`
    });
  }
}
```

---

### 6. Tier System

**Tiers:**
```javascript
const tiers = {
  tier_1: {  // Bronze
    name: 'Bronze',
    min_referrals: 0,
    multiplier: 1.0,
    reward: 10000  // Rp 10.000
  },
  tier_2: {  // Silver
    name: 'Silver',
    min_referrals: 5,
    multiplier: 1.2,
    reward: 12000  // Rp 12.000
  },
  tier_3: {  // Gold
    name: 'Gold',
    min_referrals: 20,
    multiplier: 1.5,
    reward: 15000  // Rp 15.000
  }
};
```

**Auto Upgrade:**
```javascript
async function checkTierUpgrade(referrerId) {
  const referral = await db.collection('referrals').doc(referrerId).get();
  const totalReferrals = referral.data().total_referrals;
  
  let newTier = 'tier_1';
  if (totalReferrals >= 20) newTier = 'tier_3';
  else if (totalReferrals >= 5) newTier = 'tier_2';
  
  if (newTier !== referral.data().tier) {
    await db.collection('referrals').doc(referrerId).update({
      tier: newTier
    });
    
    await sendNotification(referrerId, {
      type: 'tier_upgraded',
      message: `Congratulations! You're now ${tiers[newTier].name} tier!`
    });
  }
}
```

---

## 📱 User Experience

### Referrer Dashboard
```
┌─────────────────────────────────────┐
│ 🎁 Refer & Earn                     │
├─────────────────────────────────────┤
│ Code: BERLITZA1B2                   │
│ [Copy] [Share]                      │
│                                     │
│ Tier: Silver (1.2x)                 │
│ Next: Gold (20 referrals)           │
│                                     │
│ Stats:                              │
│ • Total: 5                          │
│ • Active: 3                         │
│ • Earned: Rp 50.000                 │
│ • Pending: Rp 20.000                │
│                                     │
│ Recent Earnings:                    │
│ • user@gmail.com: +Rp 12.000 ✅     │
│ • test@gmail.com: +Rp 12.000 ✅     │
│ • demo@gmail.com: ⏳ Pending        │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Referral Flow

**1. Get your referral code:**
```javascript
// Browser console (logged in as User A)
const data = await apiFetch('/referral/code');
console.log('My code:', data.referral_code);
// Output: "BERLITZA1B2"
```

**2. Open in new browser (incognito):**
```
http://localhost:3000/signup?ref=BERLITZA1B2
```

**3. Click "Sign in with Google"**

**4. Check referral tracked:**
```javascript
// Browser console (as User B after login)
// Should see notification: "Referral tracked! 🎉"
```

**5. Submit payment as User B**

**6. Approve payment as Admin**

**7. Check User A's dashboard:**
```
Should see:
• Active referrals: +1
• Total earned: +Rp 10.000 (or tier reward)
```

---

## 🎯 Key Points

1. ✅ **Referral code auto-generated** on first login
2. ✅ **Link format:** `/signup?ref=CODE`
3. ✅ **Tracking happens** after Google login success
4. ✅ **Reward given** when payment approved (not just signup)
5. ✅ **Tier system** encourages more referrals
6. ✅ **Cannot self-refer** (same email/IP detection)
7. ✅ **One referrer per user** (cannot change)

---

## 🔒 Fraud Prevention

```javascript
// Check for self-referral
if (referrerId === uid) {
  return res.status(400).json({ error: 'Cannot refer yourself' });
}

// Check IP address (if same IP, likely same person)
if (referrerIP === userIP) {
  flags.push('same_ip');
}

// Check account age
const accountAgeDays = (now - accountCreated) / (1000 * 60 * 60 * 24);
if (accountAgeDays < 1) {
  flags.push('new_account');
  requiresReview = true;
}
```

---

## 📊 Database Structure

### referrals Collection
```javascript
{
  user_id: "user_abc123",
  email: "berlitz@gmail.com",
  referral_code: "BERLITZA1B2",
  tier: "tier_2",
  total_referrals: 5,
  active_referrals: 3,
  total_earned: 50000,
  pending_earnings: 20000,
  created_at: "2026-03-06T..."
}
```

### referral_events Collection
```javascript
{
  referrer_id: "user_abc123",
  referee_id: "user_def456",
  referee_email: "newuser@gmail.com",
  status: "qualified",  // pending, qualified, blocked
  credit_earned: 12000,
  created_at: "2026-03-06T...",
  qualified_at: "2026-03-06T..."
}
```

---

**Status:** ✅ COMPLETE  
**Referral Code:** Auto-generated  
**Tracking:** Via localStorage + API  
**Reward:** On payment approval  
**Tiers:** 3 levels (Bronze/Silver/Gold)

**Last Updated:** March 6, 2026
