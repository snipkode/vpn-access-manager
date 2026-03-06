import express from 'express';
import { auth, db } from '../config/firebase.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { getReferralConfig, getReferralStats } from '../services/referral.js';

const router = express.Router();

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Get all referral stats (admin overview)
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const allReferrals = await db.collection('referrals').get();
    const allEvents = await db.collection('referral_events').get();
    const allBonuses = await db.collection('referral_bonuses').get();

    const stats = {
      total_referrers: 0,
      total_referrals: 0,
      successful_referrals: 0,
      pending_referrals: 0,
      total_rewards_paid: 0,
      total_bonuses_paid: 0,
      top_referrers: [],
      referrals_by_tier: {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
      },
    };

    // Process referrals
    const referrers = [];
    allReferrals.forEach(doc => {
      const data = doc.data();
      stats.total_referrers++;
      
      const refStats = data.stats || {};
      stats.total_referrals += refStats.total_referrals || 0;
      stats.successful_referrals += refStats.successful_referrals || 0;
      stats.pending_referrals += refStats.pending_referrals || 0;
      stats.total_rewards_paid += refStats.total_earned || 0;
      
      // Count tiers
      const tier = data.tier || 'bronze';
      stats.referrals_by_tier[tier]++;
      
      // Track top referrers
      referrers.push({
        id: doc.id,
        user_id: data.user_id,
        stats: refStats,
        tier,
      });
    });

    // Sort and get top 10 referrers
    referrers.sort((a, b) => (b.stats.successful_referrals || 0) - (a.stats.successful_referrals || 0));
    stats.top_referrers = referrers.slice(0, 10);

    // Process bonuses
    allBonuses.forEach(doc => {
      const data = doc.data();
      stats.total_bonuses_paid += data.amount || 0;
    });

    // Process events for additional stats
    let total_payment_amount = 0;
    allEvents.forEach(doc => {
      const data = doc.data();
      if (data.payment_amount) {
        total_payment_amount += data.payment_amount;
      }
    });

    stats.total_payment_amount = total_payment_amount;
    stats.average_referrals_per_user = stats.total_referrers > 0 
      ? (stats.total_referrals / stats.total_referrers).toFixed(2) 
      : 0;

    res.json({ stats });
  } catch (error) {
    console.error('Get referral stats error:', error.message);
    res.status(500).json({
      error: 'Failed to get referral stats',
      details: error.message,
    });
  }
});

// Get referral details by user ID
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const referralDoc = await db.collection('referrals').doc(id).get();
    
    if (!referralDoc.exists) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    const data = referralDoc.data();
    
    // Get user info
    const userDoc = await db.collection('users').doc(id).get();
    const userEmail = userDoc.exists ? userDoc.data().email : null;

    // Get referral events
    const eventsSnapshot = await db.collection('referral_events')
      .where('referrer_id', '==', id)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const events = [];
    for (const doc of eventsSnapshot.docs) {
      const eventData = doc.data();
      
      // Get referee info
      const refereeDoc = await db.collection('users').doc(eventData.referee_id).get();
      const refereeEmail = refereeDoc.exists ? refereeDoc.data().email : null;
      
      events.push({
        id: doc.id,
        ...eventData,
        referee_email: refereeEmail,
      });
    }

    res.json({
      referral: {
        id: referralDoc.id,
        user_email: userEmail,
        ...data,
        events,
      },
    });
  } catch (error) {
    console.error('Get referral details error:', error.message);
    res.status(500).json({
      error: 'Failed to get referral details',
      details: error.message,
    });
  }
});

// Get all referral events (with filters)
router.get('/events', verifyAdmin, async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;

    let query = db.collection('referral_events')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('status', '==', status);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    const eventsSnapshot = await query.get();

    const events = [];
    for (const doc of eventsSnapshot.docs) {
      const data = doc.data();
      
      // Get referrer and referee info
      const referrerDoc = await db.collection('users').doc(data.referrer_id).get();
      const refereeDoc = await db.collection('users').doc(data.referee_id).get();
      
      events.push({
        id: doc.id,
        ...data,
        referrer_email: referrerDoc.exists ? referrerDoc.data().email : null,
        referee_email: refereeDoc.exists ? refereeDoc.data().email : null,
      });
    }

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error.message);
    res.status(500).json({
      error: 'Failed to get referral events',
      details: error.message,
    });
  }
});

// Get referral config (admin view)
router.get('/config', verifyAdmin, async (req, res) => {
  try {
    const config = getReferralConfig();

    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get referral config',
      details: error.message,
    });
  }
});

// Update referral config
router.patch('/config', verifyAdmin, async (req, res) => {
  try {
    const {
      referrer_reward,
      referee_reward,
      bonus_threshold,
      fraud_prevention,
    } = req.body;

    const configRef = db.collection('referral_config').doc('settings');
    const configDoc = await configRef.get();

    const updateData = {
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (referrer_reward !== undefined) updateData.referrer_reward = parseInt(referrer_reward);
    if (referee_reward !== undefined) updateData.referee_reward = parseInt(referee_reward);
    if (bonus_threshold !== undefined) updateData.bonus_threshold = parseInt(bonus_threshold);
    if (fraud_prevention !== undefined) updateData.fraud_prevention = fraud_prevention;

    if (!configDoc.exists) {
      updateData.created_at = new Date().toISOString();
      await configRef.set(updateData);
    } else {
      await configRef.update(updateData);
    }

    res.json({
      message: 'Referral config updated',
      config: updateData,
    });
  } catch (error) {
    console.error('Update config error:', error.message);
    res.status(500).json({
      error: 'Failed to update referral config',
      details: error.message,
    });
  }
});

// Get fraudulent referrals
router.get('/fraud/suspects', verifyAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get referrals with fraud flags
    const eventsSnapshot = await db.collection('referral_events')
      .where('status', '==', 'flagged')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .get();

    const suspects = [];
    for (const doc of eventsSnapshot.docs) {
      const data = doc.data();
      
      const referrerDoc = await db.collection('users').doc(data.referrer_id).get();
      const refereeDoc = await db.collection('users').doc(data.referee_id).get();
      
      suspects.push({
        id: doc.id,
        ...data,
        referrer_email: referrerDoc.exists ? referrerDoc.data().email : null,
        referee_email: refereeDoc.exists ? refereeDoc.data().email : null,
      });
    }

    res.json({ suspects });
  } catch (error) {
    console.error('Get fraud suspects error:', error.message);
    res.status(500).json({
      error: 'Failed to get fraud suspects',
      details: error.message,
    });
  }
});

// Mark referral as reviewed
router.patch('/events/:id/review', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    await db.collection('referral_events').doc(id).update({
      status,
      admin_notes: notes || '',
      reviewed_by: req.user.uid,
      reviewed_at: new Date().toISOString(),
    });

    res.json({
      message: 'Referral event updated',
      status,
    });
  } catch (error) {
    console.error('Review event error:', error.message);
    res.status(500).json({
      error: 'Failed to review referral event',
      details: error.message,
    });
  }
});

export default router;
