import express from 'express';
import { auth, db } from '../config/firebase.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { rateLimiters, validateProofFile } from '../middleware/rateLimit.js';
import { emailNotifications } from '../services/email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Payment submission and subscription management
 */

// Configure multer for proof upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
});

// Middleware to verify auth
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Middleware to check if billing is enabled
const checkBillingEnabled = async (req, res, next) => {
  try {
    const settingsDoc = await db.collection('payment_settings').doc('config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    if (!settings.billing_enabled) {
      return res.status(503).json({ 
        error: 'Billing disabled',
        message: 'Payment functionality is currently unavailable. Please contact admin.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check billing status', details: error.message });
  }
};

// Pricing plans
const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
  yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
};

/**
 * @swagger
 * /api/billing/trial:
 *   post:
 *     summary: Activate 7-day free trial
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial activated successfully
 *       400:
 *         description: User already used trial or has active subscription
 *       401:
 *         description: Unauthorized
 */
router.post('/trial', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { device_info } = req.body;

    // Get user document
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check if user already has active subscription
    if (userData.subscription_end_at) {
      const subscriptionEnd = new Date(userData.subscription_end_at);
      if (subscriptionEnd > new Date()) {
        return res.status(400).json({
          error: 'Active subscription exists',
          message: 'You already have an active subscription'
        });
      }
    }

    // Check if user already used trial
    if (userData.trial_used === true) {
      return res.status(400).json({
        error: 'Trial already used',
        message: 'You have already used your free trial'
      });
    }

    // Calculate trial end date (7 days from now)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Prepare fraud tracking data
    const fraudTrackingData = {
      trial_activated_at: new Date().toISOString(),
      trial_device_info: device_info || null,
      trial_ip_address: req.ip || req.connection.remoteAddress || null,
      trial_user_agent: req.headers['user-agent'] || null,
    };

    // Update user document
    await db.collection('users').doc(uid).update({
      subscription_start_at: new Date().toISOString(),
      subscription_end_at: trialEnd.toISOString(),
      trial_used: true,
      ...fraudTrackingData,
      updated_at: new Date().toISOString(),
    });

    // Create payment record for trial with device info
    const paymentData = {
      user_id: uid,
      type: 'trial',
      amount: 0,
      status: 'completed',
      plan: 'trial',
      duration_days: 7,
      subscription_start: new Date().toISOString(),
      subscription_end: trialEnd.toISOString(),
      created_at: new Date().toISOString(),
      notes: '7-day free trial',
      device_info: device_info || null,
      ip_address: req.ip || req.connection.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
    };

    const paymentRef = await db.collection('payments').add(paymentData);

    // Log fraud tracking for security
    console.log('🔍 Trial activated with fraud tracking:', {
      uid,
      ip: fraudTrackingData.trial_ip_address,
      device: device_info?.publicIP || 'N/A',
      platform: device_info?.platform || 'N/A',
    });

    res.json({
      success: true,
      message: '7-day free trial activated successfully!',
      trial_end: trialEnd.toISOString(),
      payment_id: paymentRef.id,
    });
  } catch (error) {
    console.error('Trial activation error:', error.message);
    res.status(500).json({
      error: 'Failed to activate trial',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/billing/submit:
 *   post:
 *     summary: Submit payment proof for subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - proof
 *               - amount
 *               - plan
 *               - bank_from
 *               - transfer_date
 *             properties:
 *               proof:
 *                 type: string
 *                 format: binary
 *                 description: Payment proof image (JPEG, PNG, PDF) - max 5MB
 *               amount:
 *                 type: integer
 *                 example: 50000
 *               plan:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *               bank_from:
 *                 type: string
 *                 example: BCA
 *               transfer_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment proof submitted successfully
 *       400:
 *         description: Invalid plan, amount, or missing required fields
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Billing disabled
 */
router.post('/submit', 
  verifyAuth,
  checkBillingEnabled,
  rateLimiters.billingSubmit,
  upload.single('proof'),
  validateProofFile,
  async (req, res) => {
  try {
    const { uid } = req.user;
    const { amount, plan, bank_from, transfer_date, notes } = req.body;

    console.log('📥 [BILLING SUBMIT] Received:', { plan, amount, bank_from, transfer_date, mode: plan === 'topup' ? 'topup' : 'subscription' });

    // Determine if this is a topup or subscription
    const isTopup = plan === 'topup' || !plan;
    
    let planInfo = null;

    if (!isTopup) {
      // Validate plan for subscription
      if (!plan) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          error: 'Invalid plan',
          message: 'Plan is required for subscription',
          available_plans: Object.keys(PLANS)
        });
      }

      // Get plan info - try hardcoded PLANS first, then check database
      planInfo = PLANS[plan];
      
      if (!planInfo) {
        // Try to get plans from payment_settings
        try {
          const settingsDoc = await db.collection('payment_settings').doc('config').get();
          const settings = settingsDoc.exists ? settingsDoc.data() : {};
          const plans = settings.plans || [];
          const foundPlan = plans.find(p => p.id === plan);
          
          if (foundPlan) {
            planInfo = {
              price: foundPlan.price || 0,
              duration: foundPlan.duration || 0,
              label: foundPlan.label || plan,
            };
            console.log('✅ [BILLING SUBMIT] Found plan in database:', planInfo);
          }
        } catch (dbError) {
          console.warn('⚠️ [BILLING SUBMIT] Failed to get plans from database:', dbError.message);
        }
      }

      if (!planInfo) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        console.error('❌ [BILLING SUBMIT] Invalid plan:', plan);
        console.error('   Available plans:', Object.keys(PLANS));
        console.error('   Plans from DB:', settings.plans?.map(p => p.id) || 'none');
        
        return res.status(400).json({
          error: 'Invalid plan',
          message: `Plan "${plan}" not found. Available: ${Object.keys(PLANS).join(', ')}`,
          received_plan: plan,
          available_plans: Object.keys(PLANS)
        });
      }

      console.log('✅ [BILLING SUBMIT] Plan validated:', planInfo);

      // Validate amount for subscription (allow small difference for bank fees)
      const parsedAmount = parseInt(amount);
      if (isNaN(parsedAmount) || parsedAmount < planInfo.price * 0.9) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          error: 'Invalid amount',
          expected: planInfo.price,
          submitted: amount
        });
      }
    } else {
      // Topup mode - validate minimum amount
      const parsedAmount = parseInt(amount);
      const minTopup = 10000; // Default minimum topup
      
      if (isNaN(parsedAmount) || parsedAmount < minTopup) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          error: 'Invalid amount',
          message: `Minimum topup is ${formatCurrency(minTopup)}`,
          submitted: amount
        });
      }

      planInfo = {
        price: parsedAmount,
        duration: 0,
        label: 'Top Up',
      };

      console.log('✅ [BILLING SUBMIT] Topup validated:', planInfo);
    }

    // Validate transfer date
    if (!transfer_date) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Transfer date is required' });
    }

    // Check if proof file exists
    if (!req.file) {
      return res.status(400).json({ error: 'Proof of transfer is required' });
    }

    // Check for pending payments
    const pendingPayments = await db.collection('payments')
      .where('user_id', '==', uid)
      .where('status', '==', 'pending')
      .get();

    if (pendingPayments.size > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'You have a pending payment',
        message: 'Please wait for admin approval before submitting another payment'
      });
    }

    // Create payment record
    const paymentRef = db.collection('payments').doc();
    const paymentData = {
      user_id: uid,
      amount: parseInt(amount),
      plan: isTopup ? 'topup' : plan,
      plan_label: planInfo.label,
      duration_days: planInfo.duration || 0,
      bank_from: bank_from || 'Unknown',
      transfer_date: new Date(transfer_date).toISOString(),
      proof_image_url: `/uploads/proofs/${req.file.filename}`,
      proof_filename: req.file.filename,
      status: 'pending',
      notes: notes || '',
      admin_note: '',
      approved_by: null,
      is_topup: isTopup,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await paymentRef.set(paymentData);

    // Send email notification to admin
    try {
      // Get user email
      const userDoc = await db.collection('users').doc(uid).get();
      const userEmail = userDoc.exists ? userDoc.data().email : null;
      
      if (userEmail) {
        await emailNotifications.notifyPaymentSubmitted(paymentData, userEmail);
      }
    } catch (emailError) {
      console.error('Failed to send payment notification email:', emailError.message);
    }

    res.status(201).json({
      message: 'Payment proof submitted successfully',
      payment: {
        id: paymentRef.id,
        ...paymentData,
      },
    });
  } catch (error) {
    console.error('Submit payment error:', error.message);
    
    // Clean up file if exists
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    
    res.status(500).json({ 
      error: 'Failed to submit payment', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/billing/history:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Payment history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       500:
 *         description: Failed to get payment history
 */
router.get('/history', verifyAuth, rateLimiters.billingView, async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 20, status } = req.query;

    let query = db.collection('payments')
      .where('user_id', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('status', '==', status);
    }

    const paymentsSnapshot = await query.get();

    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ payments });
  } catch (error) {
    console.error('Get payment history error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get payment history', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/billing/subscription:
 *   get:
 *     summary: Get user's subscription status
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     active: { type: boolean }
 *                     plan: { type: string }
 *                     plan_label: { type: string }
 *                     subscription_end: { type: string, format: date-time }
 *                     days_remaining: { type: integer }
 *                     vpn_enabled: { type: boolean }
 *                     total_purchases: { type: integer }
 *       404:
 *         description: User not found
 */
router.get('/subscription', verifyAuth, rateLimiters.billingView, async (req, res) => {
  try {
    const { uid } = req.user;

    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check for trial subscription FIRST
    let subscriptionEnd = null;
    let activePlan = null;
    let totalDays = 0;

    // Check if user has active trial
    if (userData.trial_used === true && userData.subscription_end_at) {
      const trialEnd = new Date(userData.subscription_end_at);
      if (trialEnd > new Date()) {
        subscriptionEnd = userData.subscription_end_at;
        activePlan = 'trial';
        totalDays = 7;
      }
    }

    // Get approved payments
    const approvedPayments = await db.collection('payments')
      .where('user_id', '==', uid)
      .where('status', '==', 'approved')
      .orderBy('created_at', 'desc')
      .get();

    // Calculate subscription end date from payments
    approvedPayments.forEach(doc => {
      const payment = doc.data();
      const paymentDate = new Date(payment.created_at);
      const endDate = new Date(paymentDate);
      endDate.setDate(endDate.getDate() + payment.duration_days);

      if (endDate > new Date()) {
        if (!subscriptionEnd || endDate > subscriptionEnd) {
          subscriptionEnd = endDate.toISOString();
          activePlan = payment.plan;
        }
        totalDays += payment.duration_days;
      }
    });

    res.json({
      subscription: {
        active: userData.vpn_enabled && subscriptionEnd && new Date(subscriptionEnd) > new Date(),
        plan: activePlan,
        plan_label: activePlan === 'trial' ? '7-Day Trial' : (activePlan ? PLANS[activePlan]?.label : null),
        subscription_end: subscriptionEnd,
        days_remaining: subscriptionEnd
          ? Math.max(0, Math.floor((new Date(subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0,
        vpn_enabled: userData.vpn_enabled,
        total_purchases: approvedPayments.size,
        trial_used: userData.trial_used || false,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get subscription status', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/billing/plans:
 *   get:
 *     summary: Get available subscription plans and bank accounts
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Available plans retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 billing_enabled: { type: boolean }
 *                 currency: { type: string, example: IDR }
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       price: { type: integer }
 *                       duration: { type: integer }
 *                       label: { type: string }
 *                       price_formatted: { type: string }
 *                 bank_accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       bank: { type: string }
 *                       account_number: { type: string }
 *                       account_name: { type: string }
 */
router.get('/plans', async (req, res) => {
  try {
    // Check if billing is enabled
    const settingsDoc = await db.collection('payment_settings').doc('config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { billing_enabled: false, currency: 'IDR' };

    // Get active bank accounts from database
    let bank_accounts = [];
    if (settings.billing_enabled) {
      try {
        const banksSnapshot = await db.collection('bank_accounts')
          .where('active', '==', true)
          .orderBy('order', 'asc')
          .get();

        bank_accounts = banksSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            bank: data.bank,
            account_number: data.account_number,
            account_name: data.account_name,
            description: data.description,
            qr_code_url: data.qr_code_url,
          };
        });
      } catch (indexError) {
        console.error('Bank accounts query failed (missing index):', indexError.message);
        // Fallback: get banks without ordering
        const banksSnapshot = await db.collection('bank_accounts')
          .where('active', '==', true)
          .get();
        
        bank_accounts = banksSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            bank: data.bank,
            account_number: data.account_number,
            account_name: data.account_name,
            description: data.description,
            qr_code_url: data.qr_code_url,
          };
        });
      }
    }

    const plans = Object.entries(PLANS).map(([key, value]) => ({
      id: key,
      ...value,
      price_formatted: formatCurrency(value.price),
    }));

    res.json({
      billing_enabled: settings.billing_enabled || false,
      currency: settings.currency || 'IDR',
      plans,
      bank_accounts,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plans', details: error.message });
  }
});

// Get payment by ID
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const paymentDoc = await db.collection('payments').doc(id).get();

    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentData = paymentDoc.data();

    // Users can only view their own payments
    if (paymentData.user_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ payment: paymentData });
  } catch (error) {
    console.error('Get payment error:', error.message);
    res.status(500).json({ error: 'Failed to get payment', details: error.message });
  }
});

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default router;
