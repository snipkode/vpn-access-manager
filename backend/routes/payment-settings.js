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

// Get payment settings
router.get('/settings', verifyAdmin, async (req, res) => {
  try {
    const settingsDoc = await db.collection('payment_settings').doc('config').get();
    
    const settings = settingsDoc.exists ? settingsDoc.data() : {
      billing_enabled: false,
      currency: 'IDR',
      min_amount: 10000,
      max_amount: 1000000,
      auto_approve: false,
      notification_email: null,
    };

    // Get bank accounts
    const banksSnapshot = await db.collection('bank_accounts')
      .orderBy('order', 'asc')
      .get();

    const bank_accounts = banksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ 
      settings,
      bank_accounts,
    });
  } catch (error) {
    console.error('Get payment settings error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get payment settings', 
      details: error.message 
    });
  }
});

// Update payment settings
router.patch('/settings', verifyAdmin, async (req, res) => {
  try {
    const { 
      billing_enabled, 
      currency, 
      min_amount, 
      max_amount, 
      auto_approve,
      notification_email 
    } = req.body;

    const settingsRef = db.collection('payment_settings').doc('config');
    const settingsDoc = await settingsRef.get();

    const updateData = {
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (billing_enabled !== undefined) updateData.billing_enabled = billing_enabled;
    if (currency !== undefined) updateData.currency = currency;
    if (min_amount !== undefined) updateData.min_amount = parseInt(min_amount);
    if (max_amount !== undefined) updateData.max_amount = parseInt(max_amount);
    if (auto_approve !== undefined) updateData.auto_approve = auto_approve;
    if (notification_email !== undefined) updateData.notification_email = notification_email;

    if (!settingsDoc.exists) {
      await settingsRef.set({
        created_at: new Date().toISOString(),
        ...updateData,
      });
    } else {
      await settingsRef.update(updateData);
    }

    res.json({ 
      message: 'Payment settings updated',
      settings: {
        billing_enabled: updateData.billing_enabled,
        currency: updateData.currency,
        min_amount: updateData.min_amount,
        max_amount: updateData.max_amount,
        auto_approve: updateData.auto_approve,
        notification_email: updateData.notification_email,
      }
    });
  } catch (error) {
    console.error('Update settings error:', error.message);
    res.status(500).json({ 
      error: 'Failed to update payment settings', 
      details: error.message 
    });
  }
});

// Get bank accounts (public endpoint for users)
router.get('/banks', async (req, res) => {
  try {
    // Check if billing is enabled
    const settingsDoc = await db.collection('payment_settings').doc('config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    if (!settings.billing_enabled) {
      return res.status(503).json({ 
        error: 'Billing is currently disabled',
        message: 'Payment functionality is temporarily unavailable'
      });
    }

    const banksSnapshot = await db.collection('bank_accounts')
      .where('active', '==', true)
      .orderBy('order', 'asc')
      .get();

    const bank_accounts = banksSnapshot.docs.map(doc => {
      const data = doc.data();
      // Hide sensitive info for public endpoint
      return {
        id: doc.id,
        bank: data.bank,
        account_number: data.account_number,
        account_name: data.account_name,
        description: data.description,
        qr_code_url: data.qr_code_url,
      };
    });

    res.json({ 
      bank_accounts,
      currency: settings.currency || 'IDR',
    });
  } catch (error) {
    console.error('Get banks error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get bank accounts', 
      details: error.message 
    });
  }
});

// Create bank account
router.post('/banks', verifyAdmin, async (req, res) => {
  try {
    const { 
      bank, 
      account_number, 
      account_name, 
      description, 
      qr_code_url,
      order = 0 
    } = req.body;

    if (!bank || !account_number || !account_name) {
      return res.status(400).json({ 
        error: 'Bank, account number, and account name are required' 
      });
    }

    const bankRef = db.collection('bank_accounts').doc();
    const bankData = {
      bank,
      account_number,
      account_name,
      description: description || '',
      qr_code_url: qr_code_url || '',
      active: true,
      order: parseInt(order),
      created_at: new Date().toISOString(),
      created_by: req.user.uid,
      updated_at: new Date().toISOString(),
    };

    await bankRef.set(bankData);

    res.status(201).json({ 
      message: 'Bank account created',
      bank: { id: bankRef.id, ...bankData }
    });
  } catch (error) {
    console.error('Create bank error:', error.message);
    res.status(500).json({ 
      error: 'Failed to create bank account', 
      details: error.message 
    });
  }
});

// Update bank account
router.patch('/banks/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      bank, 
      account_number, 
      account_name, 
      description, 
      qr_code_url,
      active,
      order 
    } = req.body;

    const bankRef = db.collection('bank_accounts').doc(id);
    const bankDoc = await bankRef.get();

    if (!bankDoc.exists) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const updateData = {
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    if (bank !== undefined) updateData.bank = bank;
    if (account_number !== undefined) updateData.account_number = account_number;
    if (account_name !== undefined) updateData.account_name = account_name;
    if (description !== undefined) updateData.description = description;
    if (qr_code_url !== undefined) updateData.qr_code_url = qr_code_url;
    if (active !== undefined) updateData.active = active;
    if (order !== undefined) updateData.order = parseInt(order);

    await bankRef.update(updateData);

    res.json({ 
      message: 'Bank account updated',
      bank: { id, ...updateData }
    });
  } catch (error) {
    console.error('Update bank error:', error.message);
    res.status(500).json({ 
      error: 'Failed to update bank account', 
      details: error.message 
    });
  }
});

// Delete bank account
router.delete('/banks/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bankRef = db.collection('bank_accounts').doc(id);
    const bankDoc = await bankRef.get();

    if (!bankDoc.exists) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    await bankRef.delete();

    res.json({ message: 'Bank account deleted' });
  } catch (error) {
    console.error('Delete bank error:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete bank account', 
      details: error.message 
    });
  }
});

// Toggle billing enabled/disabled
router.post('/toggle-billing', verifyAdmin, async (req, res) => {
  try {
    const { billing_enabled } = req.body;

    if (typeof billing_enabled !== 'boolean') {
      return res.status(400).json({ error: 'billing_enabled must be boolean' });
    }

    const settingsRef = db.collection('payment_settings').doc('config');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      await settingsRef.set({
        billing_enabled,
        currency: 'IDR',
        min_amount: 10000,
        max_amount: 1000000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: req.user.uid,
      });
    } else {
      await settingsRef.update({
        billing_enabled,
        updated_at: new Date().toISOString(),
        updated_by: req.user.uid,
      });
    }

    res.json({ 
      message: `Billing ${billing_enabled ? 'enabled' : 'disabled'}`,
      billing_enabled,
    });
  } catch (error) {
    console.error('Toggle billing error:', error.message);
    res.status(500).json({ 
      error: 'Failed to toggle billing', 
      details: error.message 
    });
  }
});

// Get billing status (public)
router.get('/status', async (req, res) => {
  try {
    const settingsDoc = await db.collection('payment_settings').doc('config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    res.json({
      billing_enabled: settings.billing_enabled || false,
      currency: settings.currency || 'IDR',
      maintenance_mode: !settings.billing_enabled,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get billing status', 
      details: error.message 
    });
  }
});

export default router;
