import express from 'express';
import { auth, db } from '../config/firebase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimiters } from '../middleware/rateLimit.js';
import { emailNotifications } from '../services/email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// Get all payments (with filters)
router.get('/payments', verifyAdmin, rateLimiters.adminBillingView, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = db.collection('payments')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (status) {
      query = query.where('status', '==', status);
    }

    const paymentsSnapshot = await query.get();

    const payments = await Promise.all(
      paymentsSnapshot.docs.map(async doc => {
        const data = doc.data();
        // Get user email for display
        const userDoc = await db.collection('users').doc(data.user_id).get();
        return {
          id: doc.id,
          ...data,
          user_email: userDoc.exists ? userDoc.data().email : 'Unknown',
        };
      })
    );

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get payments', 
      details: error.message 
    });
  }
});

// Get payment details
router.get('/payments/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const paymentDoc = await db.collection('payments').doc(id).get();

    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const data = paymentDoc.data();
    
    // Get user info
    const userDoc = await db.collection('users').doc(data.user_id).get();

    res.json({ 
      payment: {
        id: paymentDoc.id,
        ...data,
        user_email: userDoc.exists ? userDoc.data().email : 'Unknown',
      } 
    });
  } catch (error) {
    console.error('Get payment error:', error.message);
    res.status(500).json({ error: 'Failed to get payment', details: error.message });
  }
});

// Approve payment
router.post('/payments/:id/approve', verifyAdmin, rateLimiters.adminBillingWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    const paymentRef = db.collection('payments').doc(id);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentData = paymentDoc.data();

    if (paymentData.status !== 'pending') {
      return res.status(400).json({
        error: 'Payment already processed',
        current_status: paymentData.status
      });
    }

    // Update payment status
    await paymentRef.update({
      status: 'approved',
      admin_note: admin_note || '',
      approved_by: req.user.uid,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Get user data
    const userRef = db.collection('users').doc(paymentData.user_id);
    const userDoc = await userRef.get();

    let userEmail = null;
    let creditBalance = 0;
    if (userDoc.exists) {
      const userData = userDoc.data();
      userEmail = userData.email;
      creditBalance = userData.credit_balance || 0;
    }

    // Check if this is a top-up (plan === 'topup' or no duration)
    const isTopup = paymentData.plan === 'topup' || !paymentData.duration_days || paymentData.duration_days === 0;

    if (isTopup) {
      // For top-up: Add credit to user balance using Firestore Transaction
      let newBalance = 0;
      
      console.log(`💰 Starting transaction for user ${paymentData.user_id}`);
      
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }
        
        const currentBalance = userDoc.data().credit_balance || 0;
        newBalance = currentBalance + paymentData.amount;
        
        console.log(`💰 Transaction: ${currentBalance} + ${paymentData.amount} = ${newBalance}`);
        
        transaction.update(userRef, {
          credit_balance: newBalance,
          updated_at: new Date().toISOString(),
        });
      });

      console.log(`✅ Balance updated via transaction: user=${paymentData.user_id}, newBalance=${newBalance}`);

      // Create credit transaction record
      const transactionRef = db.collection('credit_transactions').doc();
      await transactionRef.set({
        user_id: paymentData.user_id,
        type: 'topup',
        amount: paymentData.amount,
        status: 'completed',
        description: 'Top-up approved',
        related_payment_id: id,
        created_at: new Date().toISOString(),
      });

      console.log(`✅ Top-up approved: Added ${paymentData.amount} to user ${paymentData.user_id}`);
    } else {
      // For subscription: Extend subscription end date
      let currentEnd = userDoc.exists && userDoc.data().subscription_end
        ? new Date(userDoc.data().subscription_end)
        : new Date();

      // If subscription already expired, start from now
      if (currentEnd < new Date()) {
        currentEnd = new Date();
      }

      // Add duration days
      currentEnd.setDate(currentEnd.getDate() + paymentData.duration_days);

      // Update user
      await userRef.update({
        vpn_enabled: true,
        subscription_end: currentEnd.toISOString(),
        subscription_plan: paymentData.plan,
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ Subscription extended: Added ${paymentData.duration_days} days to user ${paymentData.user_id}`);
    }

    // Send email notification to user
    if (userEmail) {
      try {
        if (isTopup) {
          await emailNotifications.notifyPaymentApproved(
            userEmail,
            paymentData,
            0 // No days added for topup
          );
        } else {
          await emailNotifications.notifyPaymentApproved(
            userEmail,
            paymentData,
            paymentData.duration_days
          );
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError.message);
      }
    }

    res.json({
      message: 'Payment approved successfully',
      type: isTopup ? 'topup' : 'subscription',
      credit_added: isTopup ? paymentData.amount : 0,
      days_added: isTopup ? 0 : paymentData.duration_days,
    });
  } catch (error) {
    console.error('Approve payment error:', error.message);
    res.status(500).json({
      error: 'Failed to approve payment',
      details: error.message
    });
  }
});

// Reject payment
router.post('/payments/:id/reject', verifyAdmin, rateLimiters.adminBillingWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note, reason } = req.body;

    const paymentRef = db.collection('payments').doc(id);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentData = paymentDoc.data();

    if (paymentData.status !== 'pending') {
      return res.status(400).json({
        error: 'Payment already processed',
        current_status: paymentData.status
      });
    }

    // Update payment status
    await paymentRef.update({
      status: 'rejected',
      admin_note: admin_note || reason || '',
      approved_by: req.user.uid,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Send email notification to user
    const userRef = db.collection('users').doc(paymentData.user_id);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userEmail = userDoc.data().email;
      if (userEmail) {
        try {
          await emailNotifications.notifyPaymentRejected(
            userEmail,
            paymentData,
            admin_note || reason || 'Please contact admin for more information.'
          );
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError.message);
        }
      }
    }

    res.json({
      message: 'Payment rejected',
      note: admin_note || reason || '',
    });
  } catch (error) {
    console.error('Reject payment error:', error.message);
    res.status(500).json({
      error: 'Failed to reject payment',
      details: error.message
    });
  }
});

// Get billing statistics
router.get('/stats', verifyAdmin, rateLimiters.adminBillingView, async (req, res) => {
  try {
    const allPayments = await db.collection('payments').get();
    const bankAccountsSnapshot = await db.collection('bank_accounts').get();

    const stats = {
      total_payments: allPayments.size,
      pending: 0,
      approved: 0,
      rejected: 0,
      blocked: 0,
      total_revenue: 0,
      this_month_revenue: 0,
      last_month_revenue: 0,
      average_payment: 0,
      payment_by_plan: {},
      payment_by_bank: {},
      // Order status counts
      total_orders: 0,
      approved_orders: 0,
      pending_orders: 0,
      rejected_orders: 0,
      blocked_orders: 0,
    };

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const approvedAmounts = [];

    allPayments.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      const planLabel = data.plan_label || data.plan || 'unknown';
      const bankFrom = data.bank_from || 'unknown';

      stats.total_orders++;

      if (data.status === 'pending') {
        stats.pending++;
        stats.pending_orders++;
      }
      else if (data.status === 'approved') {
        stats.approved++;
        stats.approved_orders++;
        stats.total_revenue += amount;
        approvedAmounts.push(amount);

        // Track by plan
        if (!stats.payment_by_plan[planLabel]) {
          stats.payment_by_plan[planLabel] = { count: 0, total: 0 };
        }
        stats.payment_by_plan[planLabel].count++;
        stats.payment_by_plan[planLabel].total += amount;

        // Track by bank
        if (!stats.payment_by_bank[bankFrom]) {
          stats.payment_by_bank[bankFrom] = { count: 0, total: 0 };
        }
        stats.payment_by_bank[bankFrom].count++;
        stats.payment_by_bank[bankFrom].total += amount;

        // Monthly revenue
        const createdAt = new Date(data.created_at);
        if (createdAt.getMonth() === thisMonth && createdAt.getFullYear() === thisYear) {
          stats.this_month_revenue += amount;
        }
        if (createdAt.getMonth() === lastMonth && createdAt.getFullYear() === lastMonthYear) {
          stats.last_month_revenue += amount;
        }
      }
      else if (data.status === 'rejected') {
        stats.rejected++;
        stats.rejected_orders++;
      }
      else if (data.status === 'blocked') {
        stats.blocked++;
        stats.blocked_orders++;
      }
    });

    // Calculate average
    stats.average_payment = approvedAmounts.length > 0
      ? Math.round(approvedAmounts.reduce((a, b) => a + b, 0) / approvedAmounts.length)
      : 0;

    res.json({
      stats,
      bank_accounts_count: bankAccountsSnapshot.size,
    });
  } catch (error) {
    console.error('Get billing stats error:', error.message);
    res.status(500).json({
      error: 'Failed to get billing statistics',
      details: error.message
    });
  }
});

// Get pending payments count (for notification badge)
// This endpoint is frequently polled by frontend, so we use a more lenient limiter
router.get('/payments/pending/count', verifyAdmin, rateLimiters.adminBillingView, async (req, res) => {
  try {
    const pendingSnapshot = await db.collection('payments')
      .where('status', '==', 'pending')
      .get();

    res.json({ 
      pending_count: pendingSnapshot.size,
    });
  } catch (error) {
    console.error('Get pending count error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get pending count', 
      details: error.message 
    });
  }
});

export default router;
