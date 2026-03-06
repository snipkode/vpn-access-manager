import express from 'express';
import { auth, db } from '../config/firebase.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import {
  getUserCredit,
  addCredit,
  deductCredit,
  transferCredit,
  getFraudConfig,
} from '../services/credit.js';

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

// Get all credit transactions (with filters)
router.get('/transactions', verifyAdmin, rateLimiters.adminActions, async (req, res) => {
  try {
    const { type, status, limit = 50, userId } = req.query;

    let query = db.collection('credit_transactions')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (type) {
      query = query.where('type', '==', type);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    if (userId) {
      query = query.where('user_id', '==', userId);
    }

    let transactionsSnapshot;
    try {
      transactionsSnapshot = await query.get();
    } catch (indexError) {
      // Handle missing index error - fetch without filters
      console.warn('⚠️ Firestore index missing, fetching without filters:', indexError.message);
      
      // Fallback: Get all transactions and filter in-memory
      const allQuery = db.collection('credit_transactions')
        .orderBy('created_at', 'desc')
        .limit(200); // Limit to avoid too many reads
      
      transactionsSnapshot = await allQuery.get();
    }

    const transactions = await Promise.all(
      transactionsSnapshot.docs.map(async doc => {
        const data = doc.data();
        // Get user emails for display
        let fromEmail = null, toEmail = null;

        if (data.from_user_id) {
          const fromUser = await db.collection('users').doc(data.from_user_id).get();
          fromEmail = fromUser.exists ? fromUser.data().email : null;
        }

        if (data.to_user_id) {
          const toUser = await db.collection('users').doc(data.to_user_id).get();
          toEmail = toUser.exists ? toUser.data().email : null;
        }

        return {
          id: doc.id,
          ...data,
          from_email: fromEmail,
          to_email: toEmail,
        };
      })
    );

    // Filter in-memory if needed (fallback)
    let filteredTransactions = transactions;
    if (type || status || userId) {
      filteredTransactions = transactions.filter(tx => {
        if (type && tx.type !== type) return false;
        if (status && tx.status !== status) return false;
        if (userId && tx.user_id !== userId) return false;
        return true;
      });
    }

    res.json({ transactions: filteredTransactions });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({
      error: 'Failed to get transactions',
      details: error.message
    });
  }
});

// Get fraud alerts
router.get('/fraud-alerts', verifyAdmin, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = db.collection('fraud_alerts')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('status', '==', status);
    }

    const alertsSnapshot = await query.get();

    const alerts = await Promise.all(
      alertsSnapshot.docs.map(async doc => {
        const data = doc.data();
        // Get user email
        const userDoc = await db.collection('users').doc(data.user_id).get();
        return {
          id: doc.id,
          ...data,
          user_email: userDoc.exists ? userDoc.data().email : null,
        };
      })
    );

    res.json({ alerts });
  } catch (error) {
    console.error('Get fraud alerts error:', error.message);
    res.status(500).json({
      error: 'Failed to get fraud alerts',
      details: error.message
    });
  }
});

// Review fraud alert
router.patch('/fraud-alerts/:id/review', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    const alertRef = db.collection('fraud_alerts').doc(id);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alertData = alertDoc.data();

    if (alertData.reviewed) {
      return res.status(400).json({ error: 'Alert already reviewed' });
    }

    const updateData = {
      reviewed: true,
      reviewed_by: req.user.uid,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || '',
    };

    if (action === 'approve') {
      updateData.status = 'approved';
      
      // If there's a pending transaction, complete it
      if (alertData.transaction_id) {
        const transactionRef = db.collection('credit_transactions').doc(alertData.transaction_id);
        const transactionDoc = await transactionRef.get();
        
        if (transactionDoc.exists && transactionDoc.data().status === 'pending_review') {
          await transactionRef.update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            reviewed_by: req.user.uid,
          });
        }
      }
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      
      // If there's a pending transaction, cancel it
      if (alertData.transaction_id) {
        await db.collection('credit_transactions').doc(alertData.transaction_id).update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: notes || 'Admin rejected after review',
        });
      }
    }

    await alertRef.update(updateData);

    res.json({
      message: `Alert ${action}ed`,
      action,
    });
  } catch (error) {
    console.error('Review alert error:', error.message);
    res.status(500).json({
      error: 'Failed to review alert',
      details: error.message
    });
  }
});

// Add credit to user (admin)
router.post('/users/:id/add', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Verify user exists
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize credit account if not exists
    await getUserCredit(id);

    const result = await addCredit(id, amount, description || 'Admin credit', {
      notes,
      admin_id: req.user.uid,
    });

    res.json({
      message: 'Credit added successfully',
      new_balance: result.newBalance,
      formatted_balance: formatCurrency(result.newBalance),
      transaction_id: result.transactionId,
    });
  } catch (error) {
    console.error('Add credit error:', error.message);
    res.status(500).json({
      error: 'Failed to add credit',
      details: error.message
    });
  }
});

// Deduct credit from user (admin)
router.post('/users/:id/deduct', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Verify user exists
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await deductCredit(id, amount, description || 'Admin debit', {
      notes,
      admin_id: req.user.uid,
    });

    res.json({
      message: 'Credit deducted successfully',
      new_balance: result.newBalance,
      formatted_balance: formatCurrency(result.newBalance),
      transaction_id: result.transactionId,
    });
  } catch (error) {
    console.error('Deduct credit error:', error.message);
    if (error.message === 'Insufficient credit balance') {
      return res.status(400).json({
        error: 'Insufficient balance',
        message: 'User does not have enough credit'
      });
    }
    res.status(500).json({
      error: 'Failed to deduct credit',
      details: error.message
    });
  }
});

// Get user's credit info (admin view)
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const credit = await getUserCredit(id);

    // Get recent transactions
    const transactionsSnapshot = await db.collection('credit_transactions')
      .where('user_id', '==', id)
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      user: {
        id: userDoc.id,
        email: userDoc.data().email,
      },
      credit: {
        balance: credit.balance,
        formatted_balance: formatCurrency(credit.balance),
        total_earned: credit.total_earned,
        total_spent: credit.total_spent,
      },
      recent_transactions: transactions,
    });
  } catch (error) {
    console.error('Get user credit error:', error.message);
    res.status(500).json({
      error: 'Failed to get user credit',
      details: error.message
    });
  }
});

// Get credit statistics
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const allTransactions = await db.collection('credit_transactions').get();
    const allCredits = await db.collection('user_credits').get();

    const stats = {
      total_users_with_credit: 0,
      total_credit_in_circulation: 0,
      today_volume: 0,
      today_transactions: 0,
      pending_reviews: 0,
      blocked_transactions: 0,
    };

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    allCredits.forEach(doc => {
      const data = doc.data();
      stats.total_users_with_credit++;
      stats.total_credit_in_circulation += data.balance;
    });

    allTransactions.forEach(doc => {
      const data = doc.data();
      
      if (data.created_at >= startOfDay.toISOString()) {
        stats.today_transactions++;
        if (data.type === 'transfer') {
          stats.today_volume += data.amount;
        }
      }

      if (data.status === 'pending_review') stats.pending_reviews++;
      if (data.status === 'blocked') stats.blocked_transactions++;
    });

    res.json({
      stats: {
        ...stats,
        formatted_total_circulation: formatCurrency(stats.total_credit_in_circulation),
        formatted_today_volume: formatCurrency(stats.today_volume),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

// Get fraud config
router.get('/fraud-config', verifyAdmin, async (req, res) => {
  try {
    const config = await getFraudConfig();

    res.json({ config });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get fraud config',
      details: error.message
    });
  }
});

// Update fraud config
router.patch('/fraud-config', verifyAdmin, async (req, res) => {
  try {
    const configRef = db.collection('fraud_config').doc('settings');
    const configDoc = await configRef.get();

    const updateData = {
      updated_at: new Date().toISOString(),
      updated_by: req.user.uid,
    };

    const allowedFields = [
      'maxTransferAmount',
      'maxDailyTransfer',
      'maxTransfersPerDay',
      'minTransferInterval',
      'suspiciousAmountThreshold',
      'new_userDays',
      'new_userMaxTransfer',
      'maxTransfersPerHour',
      'suspiciousRoundAmounts',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (!configDoc.exists) {
      updateData.created_at = new Date().toISOString();
      await configRef.set(updateData);
    } else {
      await configRef.update(updateData);
    }

    res.json({
      message: 'Fraud config updated',
      config: updateData,
    });
  } catch (error) {
    console.error('Update fraud config error:', error.message);
    res.status(500).json({
      error: 'Failed to update fraud config',
      details: error.message
    });
  }
});

// Helper: Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Get top-ups (for admin approval)
router.get('/topups', verifyAdmin, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = db.collection('topups')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('status', '==', status);
    }

    const topupsSnapshot = await query.get();

    const topups = await Promise.all(
      topupsSnapshot.docs.map(async doc => {
        const data = doc.data();
        const userDoc = await db.collection('users').doc(data.user_id).get();
        return {
          id: doc.id,
          ...data,
          user_email: userDoc.exists ? userDoc.data().email : 'Unknown',
        };
      })
    );

    res.json({ topups });
  } catch (error) {
    console.error('Get topups error:', error.message);
    res.status(500).json({ error: 'Failed to get topups', details: error.message });
  }
});

// Approve top-up
router.post('/topups/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    const topupRef = db.collection('topups').doc(id);
    const topupDoc = await topupRef.get();

    if (!topupDoc.exists) {
      return res.status(404).json({ error: 'Top-up not found' });
    }

    const topupData = topupDoc.data();

    if (topupData.status !== 'pending') {
      return res.status(400).json({
        error: 'Top-up already processed',
        current_status: topupData.status
      });
    }

    // Update top-up status
    await topupRef.update({
      status: 'approved',
      admin_note: admin_note || '',
      approved_by: req.user.uid,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Add credit to user
    const userRef = db.collection('users').doc(topupData.user_id);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const currentBalance = userData.credit_balance || 0;
      const newBalance = currentBalance + topupData.amount;

      await userRef.update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      });

      // Record transaction
      const transactionRef = db.collection('credit_transactions').doc();
      await transactionRef.set({
        user_id: topupData.user_id,
        type: 'topup',
        amount: topupData.amount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: 'Top-up approved',
        related_topup_id: id,
        admin_note: admin_note || '',
        created_at: new Date().toISOString(),
      });
    }

    res.json({
      message: 'Top-up approved successfully',
      credit_added: topupData.amount,
    });
  } catch (error) {
    console.error('Approve top-up error:', error.message);
    res.status(500).json({
      error: 'Failed to approve top-up',
      details: error.message
    });
  }
});

// Reject top-up
router.post('/topups/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note, reason } = req.body;

    const topupRef = db.collection('topups').doc(id);
    const topupDoc = await topupRef.get();

    if (!topupDoc.exists) {
      return res.status(404).json({ error: 'Top-up not found' });
    }

    const topupData = topupDoc.data();

    if (topupData.status !== 'pending') {
      return res.status(400).json({
        error: 'Top-up already processed',
        current_status: topupData.status
      });
    }

    // Update top-up status
    await topupRef.update({
      status: 'rejected',
      admin_note: admin_note || reason || '',
      approved_by: req.user.uid,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.json({
      message: 'Top-up rejected',
      note: admin_note || reason || '',
    });
  } catch (error) {
    console.error('Reject top-up error:', error.message);
    res.status(500).json({
      error: 'Failed to reject top-up',
      details: error.message
    });
  }
});

export default router;
