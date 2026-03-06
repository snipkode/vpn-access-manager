import express from 'express';
import { auth, db } from '../config/firebase.js';
import { rateLimiters } from '../middleware/rateLimit.js';

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

// Get user profile
router.get('/profile', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    res.json({
      profile: {
        uid: userDoc.id,
        email: userData.email,
        display_name: userData.display_name || null,
        phone: userData.phone || null,
        whatsapp: userData.whatsapp || null,
        avatar_url: userData.avatar_url || null,
        role: userData.role,
        vpn_enabled: userData.vpn_enabled,
        subscription_plan: userData.subscription_plan || null,
        subscription_end: userData.subscription_end || null,
        created_at: userData.created_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to get profile', details: error.message });
  }
});

// Update user profile
router.patch('/profile', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { display_name, phone, whatsapp, avatar_url } = req.body;

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) {
      if (display_name && (display_name.length < 2 || display_name.length > 50)) {
        return res.status(400).json({ error: 'Display name must be between 2 and 50 characters' });
      }
      updateData.display_name = display_name?.trim() || null;
    }

    if (phone !== undefined) {
      if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      updateData.phone = phone || null;
    }

    if (whatsapp !== undefined) {
      if (whatsapp && !/^\+?[1-9]\d{1,14}$/.test(whatsapp)) {
        return res.status(400).json({ error: 'Invalid WhatsApp number format' });
      }
      updateData.whatsapp = whatsapp || null;
    }

    if (avatar_url !== undefined) {
      if (avatar_url && !avatar_url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid avatar URL' });
      }
      updateData.avatar_url = avatar_url || null;
    }

    await db.collection('users').doc(uid).update(updateData);

    res.json({
      message: 'Profile updated successfully',
      profile: {
        display_name: updateData.display_name,
        phone: updateData.phone,
        whatsapp: updateData.whatsapp,
        avatar_url: updateData.avatar_url,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Get user notifications/preferences
router.get('/notifications', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const prefsDoc = await db.collection('user_preferences').doc(uid).get();

    const preferences = prefsDoc.exists ? prefsDoc.data() : {
      whatsapp_enabled: true,
      email_enabled: true,
      low_balance_alert: true,
      expiring_soon_alert: true,
      payment_approved_alert: true,
      payment_rejected_alert: true,
      language: 'en',
      timezone: 'Asia/Jakarta',
    };

    res.json({ preferences });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ error: 'Failed to get notifications', details: error.message });
  }
});

// Update user notifications/preferences
router.patch('/notifications', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const {
      whatsapp_enabled,
      email_enabled,
      low_balance_alert,
      expiring_soon_alert,
      payment_approved_alert,
      payment_rejected_alert,
      language,
      timezone,
    } = req.body;

    const updateData = {
      user_id: uid,
      updated_at: new Date().toISOString(),
    };

    if (whatsapp_enabled !== undefined) updateData.whatsapp_enabled = whatsapp_enabled;
    if (email_enabled !== undefined) updateData.email_enabled = email_enabled;
    if (low_balance_alert !== undefined) updateData.low_balance_alert = low_balance_alert;
    if (expiring_soon_alert !== undefined) updateData.expiring_soon_alert = expiring_soon_alert;
    if (payment_approved_alert !== undefined) updateData.payment_approved_alert = payment_approved_alert;
    if (payment_rejected_alert !== undefined) updateData.payment_rejected_alert = payment_rejected_alert;
    if (language !== undefined) updateData.language = language;
    if (timezone !== undefined) updateData.timezone = timezone;

    await db.collection('user_preferences').doc(uid).set(updateData, { merge: true });

    res.json({
      message: 'Preferences updated successfully',
      preferences: updateData,
    });
  } catch (error) {
    console.error('Update preferences error:', error.message);
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

// Get user preferences (alias for compatibility)
router.get('/preferences', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const prefsDoc = await db.collection('user_preferences').doc(uid).get();

    const preferences = prefsDoc.exists ? prefsDoc.data() : {
      email_notifications: true,
      payment_reminders: true,
      subscription_alerts: true,
      marketing_emails: false,
      language: 'en',
      timezone: 'UTC',
      dark_mode: true,
      reduce_motion: false,
      haptic_feedback: true,
    };

    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error.message);
    res.status(500).json({ error: 'Failed to get preferences', details: error.message });
  }
});

// Update user preferences (alias for compatibility)
router.patch('/preferences', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const {
      email_notifications,
      payment_reminders,
      subscription_alerts,
      marketing_emails,
      language,
      timezone,
      dark_mode,
      reduce_motion,
      haptic_feedback,
      currency,
    } = req.body;

    const updateData = {
      user_id: uid,
      updated_at: new Date().toISOString(),
    };

    if (email_notifications !== undefined) updateData.email_notifications = email_notifications;
    if (payment_reminders !== undefined) updateData.payment_reminders = payment_reminders;
    if (subscription_alerts !== undefined) updateData.subscription_alerts = subscription_alerts;
    if (marketing_emails !== undefined) updateData.marketing_emails = marketing_emails;
    if (language !== undefined) updateData.language = language;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (dark_mode !== undefined) updateData.dark_mode = dark_mode;
    if (reduce_motion !== undefined) updateData.reduce_motion = reduce_motion;
    if (haptic_feedback !== undefined) updateData.haptic_feedback = haptic_feedback;
    if (currency !== undefined) updateData.currency = currency;

    await db.collection('user_preferences').doc(uid).set(updateData, { merge: true });

    res.json({
      message: 'Preferences updated successfully',
      preferences: updateData,
    });
  } catch (error) {
    console.error('Update preferences error:', error.message);
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

// Get user stats
router.get('/stats', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    // Get user's devices
    const devicesSnapshot = await db.collection('devices')
      .where('user_id', '==', uid)
      .where('status', '==', 'active')
      .get();

    // Get user's payments
    const paymentsSnapshot = await db.collection('payments')
      .where('user_id', '==', uid)
      .where('status', '==', 'approved')
      .get();

    res.json({
      stats: {
        total_devices: devicesSnapshot.size,
        total_payments: paymentsSnapshot.size,
        total_data: '0 GB', // Can be calculated from WireGuard logs
        uptime: '99.9%',
      },
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

// Get user data usage
router.get('/data-usage', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const devicesSnapshot = await db.collection('devices')
      .where('user_id', '==', uid)
      .get();

    res.json({
      usage: {
        devices: devicesSnapshot.size,
        total_transfer: '0 GB',
        monthly_transfer: '0 GB',
      },
    });
  } catch (error) {
    console.error('Get data usage error:', error.message);
    res.status(500).json({ error: 'Failed to get data usage', details: error.message });
  }
});

export default router;
