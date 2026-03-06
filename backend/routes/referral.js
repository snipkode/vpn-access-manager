import express from 'express';
import { auth, db } from '../config/firebase.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import {
  getOrCreateReferralCode,
  trackReferralSignup,
  qualifyReferral,
  getReferralStats,
  getReferralConfig,
} from '../services/referral.js';

const router = express.Router();

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

// Get or create referral code
router.get('/code', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const result = await getOrCreateReferralCode(uid);

    res.json({
      referral_code: result.code,
      referral_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?ref=${result.code}`,
      tier: result.tier,
      stats: result.stats,
    });
  } catch (error) {
    console.error('Get referral code error:', error.message);
    res.status(500).json({
      error: 'Failed to get referral code',
      details: error.message,
    });
  }
});

// Get referral statistics
router.get('/stats', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const stats = await getReferralStats(uid);

    res.json({
      referral: stats,
    });
  } catch (error) {
    console.error('Get referral stats error:', error.message);
    res.status(500).json({
      error: 'Failed to get referral stats',
      details: error.message,
    });
  }
});

// Track referral signup (when someone signs up with referral code)
router.post('/track', verifyAuth, rateLimiters.billingSubmit, async (req, res) => {
  try {
    const { uid } = req.user;
    const { referrer_code, metadata } = req.body;

    if (!referrer_code) {
      return res.status(400).json({ error: 'Referrer code is required' });
    }

    // Find referrer by code
    const referrerSnapshot = await db.collection('referrals')
      .where('referral_code', '==', referrer_code)
      .limit(1)
      .get();

    if (referrerSnapshot.empty) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const referrerDoc = referrerSnapshot.docs[0];
    const referrerId = referrerDoc.id;

    // Check if user already has referrer
    const existingReferral = await db.collection('referral_events')
      .where('referee_id', '==', uid)
      .limit(1)
      .get();

    if (!existingReferral.empty) {
      return res.status(400).json({
        error: 'Referral already tracked',
        message: 'You can only be referred once',
      });
    }

    // Track referral
    const result = await trackReferralSignup(referrerId, uid, {
      ...metadata,
      referee_email: req.user.email,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        fraud_flags: result.fraud_flags,
      });
    }

    res.json({
      message: 'Referral tracked successfully',
      referrer_code,
      referral_id: result.referral_id,
    });
  } catch (error) {
    console.error('Track referral error:', error.message);
    res.status(500).json({
      error: 'Failed to track referral',
      details: error.message,
    });
  }
});

// Get referral config
router.get('/config', async (req, res) => {
  try {
    const config = getReferralConfig();

    res.json({
      config: {
        referrer_reward: config.referrer_reward,
        referee_reward: config.referee_reward,
        tiers: config.tiers,
        milestone_bonuses: config.milestone_bonuses,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get referral config',
      details: error.message,
    });
  }
});

// Get referral earnings history
router.get('/earnings', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 20 } = req.query;

    const earningsSnapshot = await db.collection('referral_events')
      .where('referrer_id', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .get();

    const earnings = [];
    for (const doc of earningsSnapshot.docs) {
      const data = doc.data();
      
      // Get referee info
      const refereeDoc = await db.collection('users').doc(data.referee_id).get();
      const refereeEmail = refereeDoc.exists ? refereeDoc.data().email : null;

      earnings.push({
        id: doc.id,
        ...data,
        referee_email: refereeEmail,
      });
    }

    res.json({ earnings });
  } catch (error) {
    console.error('Get earnings error:', error.message);
    res.status(500).json({
      error: 'Failed to get earnings',
      details: error.message,
    });
  }
});

export default router;
