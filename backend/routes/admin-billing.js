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
router.get('/payments', verifyAdmin, rateLimiters.adminActions, async (req, res) => {
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
router.post('/payments/:id/approve', verifyAdmin, async (req, res) => {
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

    // Extend user subscription
    const userRef = db.collection('users').doc(paymentData.user_id);
    const userDoc = await userRef.get();

    let userEmail = null;
    if (userDoc.exists) {
      const userData = userDoc.data();
      userEmail = userData.email;

      // Calculate new subscription end date
      let currentEnd = userData.subscription_end
        ? new Date(userData.subscription_end)
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
    }

    // Send email notification to user
    if (userEmail) {
      try {
        await emailNotifications.notifyPaymentApproved(
          userEmail,
          paymentData,
          paymentData.duration_days
        );
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError.message);
      }
    }

    res.json({
      message: 'Payment approved successfully',
      subscription_extended: true,
      days_added: paymentData.duration_days,
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
router.post('/payments/:id/reject', verifyAdmin, async (req, res) => {
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
router.get('/billing/stats', verifyAdmin, async (req, res) => {
  try {
    const allPayments = await db.collection('payments').get();

    const stats = {
      total_payments: allPayments.size,
      pending: 0,
      approved: 0,
      rejected: 0,
      total_revenue: 0,
      this_month_revenue: 0,
    };

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    allPayments.forEach(doc => {
      const data = doc.data();
      
      if (data.status === 'pending') stats.pending++;
      else if (data.status === 'approved') {
        stats.approved++;
        stats.total_revenue += data.amount;
        
        const createdAt = new Date(data.created_at);
        if (createdAt.getMonth() === thisMonth && createdAt.getFullYear() === thisYear) {
          stats.this_month_revenue += data.amount;
        }
      }
      else if (data.status === 'rejected') stats.rejected++;
    });

    res.json({ stats });
  } catch (error) {
    console.error('Get billing stats error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get billing statistics', 
      details: error.message 
    });
  }
});

// Get pending payments count (for notification badge)
router.get('/payments/pending/count', verifyAdmin, async (req, res) => {
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
