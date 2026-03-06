import { db } from '../config/firebase.js';
import crypto from 'crypto';

// Referral configuration
const REFERRAL_CONFIG = {
  // Rewards
  referrer_reward: 50000,        // Referrer gets 50k credit
  referee_reward: 25000,         // New user gets 25k credit
  bonus_threshold: 10,           // Bonus after 10 successful referrals
  
  // Commission tiers
  tiers: {
    bronze: { min_referrals: 0, commission_rate: 0.05 },      // 5%
    silver: { min_referrals: 5, commission_rate: 0.08 },      // 8%
    gold: { min_referrals: 10, commission_rate: 0.10 },       // 10%
    platinum: { min_referrals: 25, commission_rate: 0.15 },   // 15%
  },
  
  // Bonus rewards
  milestone_bonuses: {
    5: 50000,    // 5 referrals = 50k bonus
    10: 150000,  // 10 referrals = 150k bonus
    25: 500000,  // 25 referrals = 500k bonus
    50: 1500000, // 50 referrals = 1.5M bonus
  },
  
  // Fraud prevention
  fraud_prevention: {
    min_account_age_days: 1,      // Referee must be 1 day old
    require_payment: true,         // Referee must make payment
    min_payment_amount: 50000,     // Minimum payment amount
    max_referrals_per_day: 10,     // Max referrals per day
    max_referrals_per_month: 100,  // Max referrals per month
    prevent_self_referral: true,   // Prevent self-referral
  },
};

// Generate unique referral code
export function generateReferralCode(userId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const code = `REF-${timestamp}-${random.substring(0, 4)}`;
  
  return code;
}

// Get or create user's referral code
export async function getOrCreateReferralCode(userId) {
  const referralDoc = await db.collection('referrals').doc(userId).get();
  
  if (referralDoc.exists) {
    const data = referralDoc.data();
    if (data.referral_code) {
      return {
        code: data.referral_code,
        stats: data.stats || {},
        tier: data.tier || 'bronze',
      };
    }
  }
  
  // Create new referral code
  const referralCode = generateReferralCode(userId);
  
  await db.collection('referrals').doc(userId).set({
    user_id: userId,
    referral_code: referralCode,
    stats: {
      total_referrals: 0,
      successful_referrals: 0,
      pending_referrals: 0,
      total_earned: 0,
      total_bonus: 0,
    },
    tier: 'bronze',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });
  
  return {
    code: referralCode,
    stats: {},
    tier: 'bronze',
  };
}

// Track referral signup
export async function trackReferralSignup(referrerId, refereeId, metadata = {}) {
  const now = new Date();
  
  // Fraud checks
  const fraudChecks = await performFraudChecks(referrerId, refereeId);
  
  if (!fraudChecks.passed) {
    return {
      success: false,
      error: fraudChecks.reason,
      fraud_flags: fraudChecks.flags,
    };
  }
  
  // Create referral record
  const referralRef = db.collection('referral_events').doc();
  
  await referralRef.set({
    referrer_id: referrerId,
    referee_id: refereeId,
    type: 'signup',
    status: 'pending', // pending, qualified, rewarded
    metadata,
    created_at: now.toISOString(),
    qualified_at: null,
    rewarded_at: null,
  });
  
  // Update referrer's pending count
  await db.collection('referrals').doc(referrerId).update({
    'stats.pending_referrals': db.FieldValue.increment(1),
    updated_at: now.toISOString(),
  });
  
  return {
    success: true,
    referral_id: referralRef.id,
    message: 'Referral tracked successfully',
  };
}

// Qualify referral (when referee makes payment)
export async function qualifyReferral(referrerId, refereeId, paymentAmount) {
  const now = new Date();
  
  // Find pending referral event
  const eventsSnapshot = await db.collection('referral_events')
    .where('referrer_id', '==', referrerId)
    .where('referee_id', '==', refereeId)
    .where('type', '==', 'signup')
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  
  if (eventsSnapshot.empty) {
    return {
      success: false,
      error: 'No pending referral found',
    };
  }
  
  const eventDoc = eventsSnapshot.docs[0];
  const eventData = eventDoc.data();
  
  // Update referral event
  await eventDoc.ref.update({
    status: 'qualified',
    qualified_at: now.toISOString(),
    payment_amount: paymentAmount,
  });
  
  // Calculate rewards
  const referrerTier = await getReferrerTier(referrerId);
  const commissionRate = REFERRAL_CONFIG.tiers[referrerTier].commission_rate;
  const commission = Math.floor(paymentAmount * commissionRate);
  const referrerReward = REFERRAL_CONFIG.referrer_reward + commission;
  const refereeReward = REFERRAL_CONFIG.referee_reward;
  
  // Reward referrer
  await rewardReferrer(referrerId, refereeId, referrerReward, commission, eventDoc.id);
  
  // Reward referee (if not already rewarded)
  await rewardReferee(refereeId, refereeReward);
  
  // Update referrer stats
  await updateReferrerStats(referrerId, referrerReward, commission);
  
  // Check for milestone bonus
  await checkMilestoneBonus(referrerId);
  
  return {
    success: true,
    referrer_reward: referrerReward,
    referee_reward: refereeReward,
    commission,
    tier: referrerTier,
  };
}

// Reward referrer
async function rewardReferrer(referrerId, refereeId, totalReward, commission, eventId) {
  const { addCredit } = await import('./credit.js');
  
  try {
    await addCredit(referrerId, totalReward, 'Referral reward', {
      type: 'referral_reward',
      referee_id: refereeId,
      referral_event_id: eventId,
      base_reward: REFERRAL_CONFIG.referrer_reward,
      commission,
    });
    
    // Update referral event
    await db.collection('referral_events').doc(eventId).update({
      status: 'rewarded',
      rewarded_at: new Date().toISOString(),
      referrer_reward: totalReward,
    });
  } catch (error) {
    console.error('Failed to reward referrer:', error.message);
    throw error;
  }
}

// Reward referee
async function rewardReferee(refereeId, reward) {
  const { addCredit } = await import('./credit.js');
  
  try {
    // Check if already rewarded
    const existingRewards = await db.collection('referral_rewards')
      .where('referee_id', '==', refereeId)
      .where('type', '==', 'signup_bonus')
      .get();
    
    if (!existingRewards.empty) {
      console.log('Referee already rewarded');
      return;
    }
    
    await addCredit(refereeId, reward, 'Referral signup bonus', {
      type: 'referee_signup_bonus',
    });
    
    // Track reward
    await db.collection('referral_rewards').doc().set({
      referee_id: refereeId,
      type: 'signup_bonus',
      amount: reward,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to reward referee:', error.message);
  }
}

// Update referrer stats
async function updateReferrerStats(referrerId, reward, commission) {
  const now = new Date();
  
  await db.collection('referrals').doc(referrerId).update({
    'stats.successful_referrals': db.FieldValue.increment(1),
    'stats.pending_referrals': db.FieldValue.increment(-1),
    'stats.total_referrals': db.FieldValue.increment(1),
    'stats.total_earned': db.FieldValue.increment(reward),
    'stats.total_commission': db.FieldValue.increment(commission),
    updated_at: now.toISOString(),
  });
  
  // Update tier
  const statsDoc = await db.collection('referrals').doc(referrerId).get();
  const stats = statsDoc.data()?.stats || {};
  const newTier = calculateTier(stats.total_referrals || 0);
  
  if (newTier !== statsDoc.data()?.tier) {
    await db.collection('referrals').doc(referrerId).update({
      tier: newTier,
    });
  }
}

// Calculate tier based on referrals count
export function calculateTier(totalReferrals) {
  const { tiers } = REFERRAL_CONFIG;
  
  if (totalReferrals >= tiers.platinum.min_referrals) return 'platinum';
  if (totalReferrals >= tiers.gold.min_referrals) return 'gold';
  if (totalReferrals >= tiers.silver.min_referrals) return 'silver';
  return 'bronze';
}

// Get referrer tier
export async function getReferrerTier(userId) {
  const referralDoc = await db.collection('referrals').doc(userId).get();
  
  if (!referralDoc.exists) {
    return 'bronze';
  }
  
  const data = referralDoc.data();
  const stats = data.stats || {};
  
  return calculateTier(stats.total_referrals || 0);
}

// Check milestone bonus
async function checkMilestoneBonus(referrerId) {
  const referralDoc = await db.collection('referrals').doc(referrerId).get();
  const stats = referralDoc.data()?.stats || {};
  const totalReferrals = stats.successful_referrals || 0;
  
  const { milestone_bonuses } = REFERRAL_CONFIG;
  
  for (const [threshold, bonus] of Object.entries(milestone_bonuses)) {
    const thresholdNum = parseInt(threshold);
    
    // Check if just reached this milestone
    if (totalReferrals === thresholdNum) {
      // Check if already claimed
      const existingBonus = await db.collection('referral_bonuses')
        .where('referrer_id', '==', referrerId)
        .where('threshold', '==', thresholdNum)
        .get();
      
      if (existingBonus.empty) {
        // Award bonus
        const { addCredit } = await import('./credit.js');
        
        try {
          await addCredit(referrerId, bonus, `Referral milestone bonus (${thresholdNum} referrals)`, {
            type: 'milestone_bonus',
            threshold: thresholdNum,
          });
          
          // Track bonus
          await db.collection('referral_bonuses').doc().set({
            referrer_id: referrerId,
            threshold: thresholdNum,
            amount: bonus,
            created_at: new Date().toISOString(),
          });
          
          // Update stats
          await db.collection('referrals').doc(referrerId).update({
            'stats.total_bonus': db.FieldValue.increment(bonus),
          });
          
          console.log(`Awarded milestone bonus: ${thresholdNum} referrals = ${bonus}`);
        } catch (error) {
          console.error('Failed to award milestone bonus:', error.message);
        }
      }
    }
  }
}

// Fraud checks
async function performFraudChecks(referrerId, refereeId) {
  const { fraud_prevention } = REFERRAL_CONFIG;
  const flags = [];
  
  // Check self-referral
  if (fraud_prevention.prevent_self_referral && referrerId === refereeId) {
    return {
      passed: false,
      reason: 'Self-referral not allowed',
      flags: ['SELF_REFERRAL'],
    };
  }
  
  // Check referee account age
  const refereeDoc = await db.collection('users').doc(refereeId).get();
  if (refereeDoc.exists) {
    const refereeData = refereeDoc.data();
    const accountAge = (Date.now() - new Date(refereeData.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (accountAge < fraud_prevention.min_account_age_days) {
      flags.push('ACCOUNT_TOO_NEW');
    }
  }
  
  // Check referrer's daily limit
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const dailyReferrals = await db.collection('referral_events')
    .where('referrer_id', '==', referrerId)
    .where('created_at', '>=', startOfDay.toISOString())
    .get();
  
  if (dailyReferrals.size >= fraud_prevention.max_referrals_per_day) {
    return {
      passed: false,
      reason: 'Daily referral limit reached',
      flags: ['DAILY_LIMIT_EXCEEDED'],
    };
  }
  
  // Check for duplicate referrals
  const existingReferral = await db.collection('referral_events')
    .where('referrer_id', '==', referrerId)
    .where('referee_id', '==', refereeId)
    .limit(1)
    .get();
  
  if (!existingReferral.empty) {
    return {
      passed: false,
      reason: 'Referral already tracked',
      flags: ['DUPLICATE_REFERRAL'],
    };
  }
  
  return {
    passed: flags.length === 0,
    reason: flags.length > 0 ? 'Fraud checks failed' : null,
    flags,
  };
}

// Get referral statistics
export async function getReferralStats(userId) {
  const referralDoc = await db.collection('referrals').doc(userId).get();
  
  if (!referralDoc.exists) {
    return {
      code: null,
      tier: 'bronze',
      stats: {},
    };
  }
  
  const data = referralDoc.data();
  
  // Get recent referrals
  const recentReferrals = await db.collection('referral_events')
    .where('referrer_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();
  
  const referrals = [];
  for (const doc of recentReferrals.docs) {
    const eventData = doc.data();
    
    // Get referee info
    const refereeDoc = await db.collection('users').doc(eventData.referee_id).get();
    const refereeEmail = refereeDoc.exists ? refereeDoc.data().email : null;
    
    referrals.push({
      id: doc.id,
      ...eventData,
      referee_email: refereeEmail,
    });
  }
  
  return {
    code: data.referral_code,
    tier: data.tier || 'bronze',
    stats: data.stats || {},
    recent_referrals: referrals,
    config: {
      referrer_reward: REFERRAL_CONFIG.referrer_reward,
      referee_reward: REFERRAL_CONFIG.referee_reward,
      tiers: REFERRAL_CONFIG.tiers,
      milestone_bonuses: REFERRAL_CONFIG.milestone_bonuses,
    },
  };
}

// Get referral config
export function getReferralConfig() {
  return REFERRAL_CONFIG;
}

export default {
  generateReferralCode,
  getOrCreateReferralCode,
  trackReferralSignup,
  qualifyReferral,
  getReferralStats,
  getReferrerTier,
  calculateTier,
  getReferralConfig,
  REFERRAL_CONFIG,
};
