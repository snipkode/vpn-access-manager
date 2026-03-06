import express from 'express';
import { auth, db } from '../config/firebase.js';

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

// Get all settings (grouped by category)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const settings = {};
    
    // Get all setting categories
    const categories = ['whatsapp', 'email', 'billing', 'general', 'notifications'];
    
    for (const category of categories) {
      const doc = await db.collection('settings').doc(category).get();
      settings[category] = doc.exists ? doc.data() : {};
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error.message);
    res.status(500).json({ error: 'Failed to get settings', details: error.message });
  }
});

// Get specific category
router.get('/:category', verifyAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const doc = await db.collection('settings').doc(category).get();
    
    res.json({
      settings: doc.exists ? doc.data() : {},
      category,
    });
  } catch (error) {
    console.error('Get settings error:', error.message);
    res.status(500).json({ error: 'Failed to get settings', details: error.message });
  }
});

// Update settings (upsert)
router.patch('/:category', verifyAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    const settingsRef = db.collection('settings').doc(category);
    const settingsDoc = await settingsRef.get();

    const data = {
      ...(settingsDoc.exists ? settingsDoc.data() : {}),
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (!settingsDoc.exists) {
      data.created_at = new Date().toISOString();
    }

    await settingsRef.set(data, { merge: true });

    res.json({
      message: 'Settings updated',
      settings: data,
    });
  } catch (error) {
    console.error('Update settings error:', error.message);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
});

// WhatsApp Settings
router.patch('/whatsapp', verifyAdmin, async (req, res) => {
  try {
    const {
      enabled,
      api_url,
      session_id,
      api_key,
      sender_name,
      test_phone,
    } = req.body;

    const settingsRef = db.collection('settings').doc('whatsapp');
    const settingsDoc = await settingsRef.get();

    const data = {
      ...(settingsDoc.exists ? settingsDoc.data() : {}),
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (enabled !== undefined) data.enabled = enabled;
    if (api_url !== undefined) data.api_url = api_url;
    if (session_id !== undefined) data.session_id = session_id;
    if (api_key !== undefined) data.api_key = api_key;
    if (sender_name !== undefined) data.sender_name = sender_name;
    if (test_phone !== undefined) data.test_phone = test_phone;

    if (!settingsDoc.exists) {
      data.created_at = new Date().toISOString();
    }

    await settingsRef.set(data, { merge: true });

    res.json({
      message: 'WhatsApp settings updated',
      settings: {
        enabled: data.enabled,
        api_url: data.api_url,
        session_id: data.session_id,
        sender_name: data.sender_name,
      },
    });
  } catch (error) {
    console.error('Update WhatsApp settings error:', error.message);
    res.status(500).json({ error: 'Failed to update WhatsApp settings', details: error.message });
  }
});

// Test WhatsApp connection
router.post('/whatsapp/test', verifyAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    const settingsDoc = await db.collection('settings').doc('whatsapp').get();
    
    if (!settingsDoc.exists) {
      return res.status(400).json({ error: 'WhatsApp settings not configured' });
    }

    const settings = settingsDoc.data();
    
    if (!settings.enabled || !settings.api_url || !settings.session_id) {
      return res.status(400).json({ error: 'WhatsApp not properly configured' });
    }

    const testPhone = settings.test_phone || req.body.test_phone;
    
    if (!testPhone) {
      return res.status(400).json({ error: 'Test phone number required' });
    }

    // Import WhatsApp service
    const { sendWhatsApp } = await import('../services/whatsapp.js');
    
    const sent = await sendWhatsApp(
      testPhone,
      message || '🔧 *WAHA Test Message*\n\nThis is a test message from VPN Access Manager.\n\nIf you receive this, WhatsApp integration is working correctly!'
    );

    if (sent) {
      res.json({ message: 'Test message sent successfully', phone: testPhone });
    } else {
      res.status(500).json({ error: 'Failed to send test message', phone: testPhone });
    }
  } catch (error) {
    console.error('Test WhatsApp error:', error.message);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Email Settings
router.patch('/email', verifyAdmin, async (req, res) => {
  try {
    const {
      enabled,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      smtp_from,
    } = req.body;

    const settingsRef = db.collection('settings').doc('email');
    const settingsDoc = await settingsRef.get();

    const data = {
      ...(settingsDoc.exists ? settingsDoc.data() : {}),
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (enabled !== undefined) data.enabled = enabled;
    if (smtp_host !== undefined) data.smtp_host = smtp_host;
    if (smtp_port !== undefined) data.smtp_port = parseInt(smtp_port);
    if (smtp_secure !== undefined) data.smtp_secure = smtp_secure;
    if (smtp_user !== undefined) data.smtp_user = smtp_user;
    if (smtp_pass !== undefined) data.smtp_pass = smtp_pass;
    if (smtp_from !== undefined) data.smtp_from = smtp_from;

    if (!settingsDoc.exists) {
      data.created_at = new Date().toISOString();
    }

    await settingsRef.set(data, { merge: true });

    res.json({
      message: 'Email settings updated',
      settings: {
        enabled: data.enabled,
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_from: data.smtp_from,
      },
    });
  } catch (error) {
    console.error('Update email settings error:', error.message);
    res.status(500).json({ error: 'Failed to update email settings', details: error.message });
  }
});

// Test Email connection
router.post('/email/test', verifyAdmin, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    const settingsDoc = await db.collection('settings').doc('email').get();
    
    if (!settingsDoc.exists) {
      return res.status(400).json({ error: 'Email settings not configured' });
    }

    const settings = settingsDoc.data();
    
    if (!settings.enabled || !settings.smtp_host || !settings.smtp_user) {
      return res.status(400).json({ error: 'Email not properly configured' });
    }

    const testEmail = to || settings.smtp_user;
    
    const nodemailer = (await import('nodemailer')).default;
    
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_secure || false,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to: testEmail,
      subject: subject || '🔧 Email Test - VPN Access Manager',
      html: body || `
        <h2>Email Test Successful</h2>
        <p>This is a test email from VPN Access Manager.</p>
        <p>If you receive this, email integration is working correctly!</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    res.json({ message: 'Test email sent successfully', email: testEmail });
  } catch (error) {
    console.error('Test email error:', error.message);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Billing Settings
router.patch('/billing', verifyAdmin, async (req, res) => {
  try {
    const {
      billing_enabled,
      currency,
      min_topup,
      max_topup,
      auto_renewal_enabled,
      low_balance_days,
      reminder_days,
    } = req.body;

    const settingsRef = db.collection('settings').doc('billing');
    const settingsDoc = await settingsRef.get();

    const data = {
      ...(settingsDoc.exists ? settingsDoc.data() : {}),
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (billing_enabled !== undefined) data.billing_enabled = billing_enabled;
    if (currency !== undefined) data.currency = currency;
    if (min_topup !== undefined) data.min_topup = parseInt(min_topup);
    if (max_topup !== undefined) data.max_topup = parseInt(max_topup);
    if (auto_renewal_enabled !== undefined) data.auto_renewal_enabled = auto_renewal_enabled;
    if (low_balance_days !== undefined) data.low_balance_days = parseInt(low_balance_days);
    if (reminder_days !== undefined) data.reminder_days = Array.isArray(reminder_days) ? reminder_days : [7, 3, 1];

    if (!settingsDoc.exists) {
      data.created_at = new Date().toISOString();
    }

    await settingsRef.set(data, { merge: true });

    res.json({
      message: 'Billing settings updated',
      settings: data,
    });
  } catch (error) {
    console.error('Update billing settings error:', error.message);
    res.status(500).json({ error: 'Failed to update billing settings', details: error.message });
  }
});

// Notification Settings
router.patch('/notifications', verifyAdmin, async (req, res) => {
  try {
    const {
      whatsapp_enabled,
      email_enabled,
      low_balance_alert,
      expiring_soon_alert,
      payment_approved_alert,
      payment_rejected_alert,
      welcome_message,
    } = req.body;

    const settingsRef = db.collection('settings').doc('notifications');
    const settingsDoc = await settingsRef.get();

    const data = {
      ...(settingsDoc.exists ? settingsDoc.data() : {}),
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (whatsapp_enabled !== undefined) data.whatsapp_enabled = whatsapp_enabled;
    if (email_enabled !== undefined) data.email_enabled = email_enabled;
    if (low_balance_alert !== undefined) data.low_balance_alert = low_balance_alert;
    if (expiring_soon_alert !== undefined) data.expiring_soon_alert = expiring_soon_alert;
    if (payment_approved_alert !== undefined) data.payment_approved_alert = payment_approved_alert;
    if (payment_rejected_alert !== undefined) data.payment_rejected_alert = payment_rejected_alert;
    if (welcome_message !== undefined) data.welcome_message = welcome_message;

    if (!settingsDoc.exists) {
      data.created_at = new Date().toISOString();
    }

    await settingsRef.set(data, { merge: true });

    res.json({
      message: 'Notification settings updated',
      settings: data,
    });
  } catch (error) {
    console.error('Update notification settings error:', error.message);
    res.status(500).json({ error: 'Failed to update notification settings', details: error.message });
  }
});

// General Settings
router.patch('/general', verifyAdmin, async (req, res) => {
  try {
    const {
      app_name,
      app_url,
      support_email,
      support_phone,
      maintenance_mode,
    } = req.body;

    const settingsRef = db.collection('settings').doc('general');
    const settingsDoc = await settingsRef.get();

    const data = {
      ...(settingsDoc.exists ? settingsDoc.data() : {}),
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (app_name !== undefined) data.app_name = app_name;
    if (app_url !== undefined) data.app_url = app_url;
    if (support_email !== undefined) data.support_email = support_email;
    if (support_phone !== undefined) data.support_phone = support_phone;
    if (maintenance_mode !== undefined) data.maintenance_mode = maintenance_mode;

    if (!settingsDoc.exists) {
      data.created_at = new Date().toISOString();
    }

    await settingsRef.set(data, { merge: true });

    res.json({
      message: 'General settings updated',
      settings: data,
    });
  } catch (error) {
    console.error('Update general settings error:', error.message);
    res.status(500).json({ error: 'Failed to update general settings', details: error.message });
  }
});

// Get public settings (for frontend)
router.get('/public/general', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('general').get();
    const data = doc.exists ? doc.data() : {};

    res.json({
      settings: {
        app_name: data.app_name || 'VPN Access Manager',
        app_url: data.app_url,
        support_email: data.support_email,
        maintenance_mode: data.maintenance_mode || false,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get public settings', details: error.message });
  }
});

export default router;
