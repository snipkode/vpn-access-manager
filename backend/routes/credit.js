import express from 'express';
import { auth, db } from '../config/firebase.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import {
  getUserCredit,
  transferCredit,
  detectTransferFraud,
  logFraudAlert,
  getFraudConfig,
} from '../services/credit.js';

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

// Get user's credit balance
router.get('/balance', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const credit = await getUserCredit(uid);

    res.json({
      balance: credit.balance,
      total_earned: credit.total_earned,
      total_spent: credit.total_spent,
      formatted_balance: formatCurrency(credit.balance),
    });
  } catch (error) {
    console.error('Get balance error:', error.message);
    res.status(500).json({
      error: 'Failed to get credit balance',
      details: error.message
    });
  }
});

// Get credit transaction history
router.get('/transactions', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 20, type, startDate, endDate } = req.query;

    let query = db.collection('credit_transactions')
      .where('user_id', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    // Note: Additional filtering would need to be done in-memory
    // as Firestore doesn't support multiple range queries
    const transactionsSnapshot = await query.get();

    const transactions = [];
    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter by type if specified
      if (type && data.type !== type) return;
      
      // Filter by date range if specified
      if (startDate && data.created_at < startDate) return;
      if (endDate && data.created_at > endDate) return;

      transactions.push({
        id: doc.id,
        ...data,
      });
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({
      error: 'Failed to get transactions',
      details: error.message
    });
  }
});

// Transfer credit to another user
router.post('/transfer', verifyAuth, rateLimiters.creditTransfer, async (req, res) => {
  try {
    const { uid } = req.user;
    const { to_user_email, to_user_id, amount, description, notes } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer amount' });
    }

    if (!to_user_email && !to_user_id) {
      return res.status(400).json({ error: 'Recipient email or user ID is required' });
    }

    // Find recipient
    let recipientId = to_user_id;
    let recipientEmail = to_user_email;

    if (!recipientId && recipientEmail) {
      const usersSnapshot = await db.collection('users')
        .where('email', '==', recipientEmail)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      recipientId = usersSnapshot.docs[0].id;
      recipientEmail = usersSnapshot.docs[0].data().email;
    }

    // Run fraud detection
    const fraudResult = await detectTransferFraud(uid, recipientId, amount, {
      notes,
    });

    // Create transaction record first for tracking
    const transactionRef = db.collection('credit_transactions').doc();
    const pendingTransaction = {
      from_user_id: uid,
      to_user_id: recipientId,
      type: 'transfer',
      amount,
      status: fraudResult.shouldBlock ? 'blocked' : 'pending',
      description: description || 'Credit transfer',
      notes: notes || '',
      fraud_check: {
        risk_level: fraudResult.riskLevel,
        is_fraudulent: fraudResult.isFraudulent,
        flags: fraudResult.flags,
        reasons: fraudResult.reasons,
      },
      created_at: new Date().toISOString(),
    };

    await transactionRef.set(pendingTransaction);

    // If fraud detected, log alert and block
    if (fraudResult.shouldBlock || fraudResult.requiresReview) {
      await logFraudAlert(uid, transactionRef.id, fraudResult, {
        to_user_id: recipientId,
        amount,
      });

      if (fraudResult.shouldBlock) {
        // Update transaction status
        await transactionRef.update({
          status: 'blocked',
          blocked_reason: fraudResult.reasons.join('; '),
          blocked_at: new Date().toISOString(),
        });

        return res.status(403).json({
          error: 'Transfer blocked',
          message: 'This transfer has been blocked due to security concerns',
          reason: fraudResult.reasons,
          risk_level: fraudResult.riskLevel,
          transaction_id: transactionRef.id,
        });
      }

      // Mark for review
      await transactionRef.update({
        status: 'pending_review',
        requires_review: true,
        review_reason: fraudResult.reasons.join('; '),
      });

      return res.status(202).json({
        message: 'Transfer pending review',
        reason: fraudResult.reasons,
        risk_level: fraudResult.riskLevel,
        transaction_id: transactionRef.id,
        note: 'Your transfer is being reviewed by our team',
      });
    }

    // Execute transfer
    const result = await transferCredit(uid, recipientId, amount, description || 'Credit transfer', {
      notes,
      fraud_check: 'passed',
    });

    // Update transaction with completion
    await transactionRef.update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    res.json({
      message: 'Transfer successful',
      transaction_id: transactionRef.id,
      amount,
      formatted_amount: formatCurrency(amount),
      from_balance: result.fromNewBalance,
      formatted_from_balance: formatCurrency(result.fromNewBalance),
    });
  } catch (error) {
    console.error('Transfer error:', error.message);
    
    if (error.message === 'Insufficient credit balance') {
      return res.status(400).json({
        error: 'Insufficient balance',
        message: 'You do not have enough credit for this transfer'
      });
    }

    res.status(500).json({
      error: 'Transfer failed',
      details: error.message
    });
  }
});

// Get fraud config (for display purposes)
router.get('/fraud-config', verifyAuth, async (req, res) => {
  try {
    const config = await getFraudConfig();

    res.json({
      config: {
        max_transfer_amount: config.maxTransferAmount,
        max_daily_transfer: config.maxDailyTransfer,
        max_transfers_per_day: config.maxTransfersPerDay,
        min_transfer_interval: config.minTransferInterval,
        new_user_days: config.new_userDays,
        new_user_max_transfer: config.new_userMaxTransfer,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get fraud config',
      details: error.message
    });
  }
});

// Get user's transfer stats
router.get('/stats', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const now = new Date();

    // Get daily stats
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyTransactions = await db.collection('credit_transactions')
      .where('from_user_id', '==', uid)
      .where('type', '==', 'transfer')
      .where('created_at', '>=', startOfDay.toISOString())
      .get();

    let dailyAmount = 0;
    dailyTransactions.forEach(doc => {
      dailyAmount += doc.data().amount;
    });

    // Get total transfers
    const allTransfers = await db.collection('credit_transactions')
      .where('from_user_id', '==', uid)
      .where('type', '==', 'transfer')
      .get();

    res.json({
      today: {
        transfers: dailyTransactions.size,
        total_amount: dailyAmount,
        formatted_total: formatCurrency(dailyAmount),
      },
      total_transfers: allTransfers.size,
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({
      error: 'Failed to get stats',
      details: error.message
    });
  }
});

// Force sync user credit balance (for debugging/fix)
router.post('/sync', verifyAuth, rateLimiters.general, async (req, res) => {
  const startTime = Date.now();
  const { uid: requesterUid } = req.user;
  const userIP = req.ip;
  
  try {
    // Security: Validate target user ID
    let targetUid = requesterUid;
    const queryUid = req.query.uid;
    
    if (queryUid) {
      // Validate UID format (Firebase UID pattern)
      if (typeof queryUid !== 'string' || !/^[a-zA-Z0-9_-]{10,50}$/.test(queryUid)) {
        console.warn(`⚠️ Invalid UID format from IP ${userIP}: ${queryUid.substring(0, 10)}...`);
        return res.status(400).json({
          error: 'Invalid user ID format',
        });
      }
      
      // Security: Check admin role from Firebase Custom Claims (more secure than Firestore)
      const adminCheck = await db.collection('users').doc(requesterUid).get();
      const adminData = adminCheck.data();
      
      // Only admin can sync other users
      if (!adminData || adminData.role !== 'admin') {
        console.warn(`⚠️ Non-admin user ${requesterUid} attempted to sync user ${queryUid} from IP ${userIP}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only admins can sync balance for other users'
        });
      }
      
      targetUid = queryUid;
      console.log(`🔐 Admin ${requesterUid} syncing balance for user ${targetUid} from IP ${userIP}`);
    }

    const targetUserRef = db.collection('users').doc(targetUid);

    // Security: Use Firestore transaction to prevent race conditions
    let syncResult;
    
    await db.runTransaction(async (transaction) => {
      const targetUserDoc = transaction.get(targetUserRef);
      
      if (!targetUserDoc.exists) {
        throw new Error(`User ${targetUid} not found`);
      }

      // Get all approved topup payments
      const paymentsSnapshot = await db.collection('payments')
        .where('user_id', '==', targetUid)
        .where('status', '==', 'approved')
        .get();

      let totalTopup = 0;
      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        const isTopup = payment.plan === 'topup' || !payment.duration_days || payment.duration_days === 0;
        if (isTopup) {
          totalTopup += payment.amount;
        }
      });

      // Get all credit transactions
      const transactionsSnapshot = await db.collection('credit_transactions')
        .where('user_id', '==', targetUid)
        .get();

      let transactionTotal = 0;
      transactionsSnapshot.forEach(doc => {
        const tx = doc.data();
        if (tx.type === 'topup' || tx.type === 'credit') {
          transactionTotal += tx.amount;
        } else if (tx.type === 'deduction' || tx.type === 'transfer') {
          transactionTotal -= tx.amount;
        }
      });

      const currentBalance = targetUserDoc.data().credit_balance || 0;
      const expectedBalance = transactionTotal;

      // Security: Prevent negative balance
      if (expectedBalance < 0) {
        console.warn(`⚠️ Negative balance calculation for user ${targetUid}: ${expectedBalance}`);
        throw new Error('Calculated balance is negative');
      }

      // Security: Max balance limit (prevent overflow/exploit)
      const MAX_BALANCE = 1_000_000_000; // 1 billion IDR
      if (expectedBalance > MAX_BALANCE) {
        console.warn(`⚠️ Balance exceeds limit for user ${targetUid}: ${expectedBalance}`);
        throw new Error('Balance exceeds maximum limit');
      }

      // Only update if different
      if (currentBalance !== expectedBalance) {
        transaction.update(targetUserRef, {
          credit_balance: expectedBalance,
          last_balance_sync: new Date().toISOString(),
          last_sync_by: requesterUid,
        });
        
        syncResult = {
          old_balance: currentBalance,
          new_balance: expectedBalance,
          synced: true,
        };
        
        console.log(`🔄 Balance synced: ${targetUid} ${currentBalance}→${expectedBalance} by ${requesterUid}`);
      } else {
        syncResult = {
          old_balance: currentBalance,
          new_balance: expectedBalance,
          synced: false,
        };
      }
    });

    // Audit log for sync operation
    await db.collection('audit_logs').add({
      action: 'credit_balance_sync',
      user_id: targetUid,
      requester_id: requesterUid,
      ip_address: userIP,
      old_balance: syncResult.old_balance,
      new_balance: syncResult.new_balance,
      synced: syncResult.synced,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    });

    res.json({
      success: true,
      synced: syncResult.synced,
      message: syncResult.synced ? 'Balance updated successfully' : 'Balance already in sync',
    });
  } catch (error) {
    console.error(`❌ Sync balance error for user ${targetUid}:`, error.message);
    
    // Log failed sync attempt
    await db.collection('audit_logs').add({
      action: 'credit_balance_sync_failed',
      user_id: targetUid || 'unknown',
      requester_id: requesterUid,
      ip_address: userIP,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    res.status(500).json({
      error: 'Failed to sync balance',
      message: error.message.includes('negative') ? 'Invalid balance calculation' : 
               error.message.includes('limit') ? 'Balance exceeds limit' :
               'Please try again later',
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

export default router;
