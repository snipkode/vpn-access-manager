import { db } from '../config/firebase.js';

// Fraud detection configuration
const FRAUD_CONFIG = {
  // Maximum transfer amount per transaction
  maxTransferAmount: 1000000, // 1 juta
  
  // Maximum daily transfer amount
  maxDailyTransfer: 5000000, // 5 juta
  
  // Maximum transfers per day
  maxTransfersPerDay: 10,
  
  // Minimum time between transfers (in minutes)
  minTransferInterval: 5,
  
  // Suspicious amount threshold (will trigger manual review)
  suspiciousAmountThreshold: 500000, // 500k
  
  // New user restriction (users created less than X days)
  new_userDays: 7,
  
  // New user max transfer limit
  new_userMaxTransfer: 100000, // 100k
  
  // Velocity check - max transfers per hour
  maxTransfersPerHour: 3,
  
  // Round amount suspicion (amounts like 100k, 200k are suspicious)
  suspiciousRoundAmounts: [100000, 200000, 500000, 1000000],
};

// Get fraud config from Firestore or use default
export async function getFraudConfig() {
  try {
    const configDoc = await db.collection('fraud_config').doc('settings').get();
    if (configDoc.exists) {
      return { ...FRAUD_CONFIG, ...configDoc.data() };
    }
  } catch (error) {
    console.error('Failed to get fraud config:', error.message);
  }
  return FRAUD_CONFIG;
}

// Fraud detection result
class FraudDetectionResult {
  constructor(isFraudulent, riskLevel, reasons, flags = []) {
    this.isFraudulent = isFraudulent;
    this.riskLevel = riskLevel; // 'low', 'medium', 'high', 'critical'
    this.reasons = reasons;
    this.flags = flags;
    this.shouldBlock = isFraudulent || riskLevel === 'critical';
    this.requiresReview = riskLevel === 'high' || riskLevel === 'medium';
  }
}

// Detect fraud for credit transfer
export async function detectTransferFraud(fromUserId, toUserId, amount, metadata = {}) {
  const config = await getFraudConfig();
  const reasons = [];
  const flags = [];
  let riskScore = 0;

  const now = new Date();
  
  // Get user data
  const fromUserDoc = await db.collection('users').doc(fromUserId).get();
  const toUserDoc = await db.collection('users').doc(toUserId).get();

  if (!fromUserDoc.exists) {
    return new FraudDetectionResult(
      true,
      'critical',
      ['Sender user not found'],
      ['INVALID_USER']
    );
  }

  if (!toUserDoc.exists) {
    return new FraudDetectionResult(
      true,
      'critical',
      ['Recipient user not found'],
      ['INVALID_RECIPIENT']
    );
  }

  const fromUser = fromUserDoc.data();
  const toUser = toUserDoc.data();

  // 1. Check amount limits
  if (amount > config.maxTransferAmount) {
    reasons.push(`Amount exceeds maximum transfer limit (${formatCurrency(config.maxTransferAmount)})`);
    flags.push('EXCEEDS_MAX_AMOUNT');
    riskScore += 50;
  }

  if (amount <= 0) {
    return new FraudDetectionResult(
      true,
      'critical',
      ['Invalid transfer amount'],
      ['INVALID_AMOUNT']
    );
  }

  // 2. Check sender's credit balance
  const fromCredit = await getUserCredit(fromUserId);
  if (fromCredit.balance < amount) {
    return new FraudDetectionResult(
      true,
      'high',
      ['Insufficient credit balance'],
      ['INSUFFICIENT_BALANCE']
    );
  }

  // 3. Check daily transfer limit
  const dailyTransfers = await getDailyTransferStats(fromUserId, now);
  
  if (dailyTransfers.totalAmount + amount > config.maxDailyTransfer) {
    reasons.push(`Would exceed daily transfer limit (${formatCurrency(config.maxDailyTransfer)})`);
    flags.push('EXCEEDS_DAILY_LIMIT');
    riskScore += 40;
  }

  if (dailyTransfers.count >= config.maxTransfersPerDay) {
    reasons.push(`Exceeded maximum transfers per day (${config.maxTransfersPerDay})`);
    flags.push('EXCEEDS_DAILY_COUNT');
    riskScore += 30;
  }

  // 4. Check transfer velocity (per hour)
  const hourlyTransfers = await getHourlyTransferStats(fromUserId, now);
  if (hourlyTransfers.count >= config.maxTransfersPerHour) {
    reasons.push(`Exceeded maximum transfers per hour (${config.maxTransfersPerHour})`);
    flags.push('HIGH_VELOCITY');
    riskScore += 35;
  }

  // 5. Check time since last transfer
  if (dailyTransfers.lastTransfer) {
    const lastTransferTime = new Date(dailyTransfers.lastTransfer);
    const minutesSinceLast = (now - lastTransferTime) / (1000 * 60);
    
    if (minutesSinceLast < config.minTransferInterval) {
      reasons.push(`Transfer too soon after previous (${Math.floor(minutesSinceLast)} min < ${config.minTransferInterval} min)`);
      flags.push('RAPID_SUCCESSION');
      riskScore += 25;
    }
  }

  // 6. Check if user is new
  const userAge = getUserAge(fromUser.created_at);
  if (userAge.days < config.new_userDays) {
    if (amount > config.new_userMaxTransfer) {
      reasons.push(`New user (${userAge.days} days) exceeds transfer limit (${formatCurrency(config.new_userMaxTransfer)})`);
      flags.push('NEW_USER_HIGH_AMOUNT');
      riskScore += 30;
    }
  }

  // 7. Check for suspicious round amounts
  if (config.suspiciousRoundAmounts.includes(amount)) {
    reasons.push(`Suspicious round amount (${formatCurrency(amount)})`);
    flags.push('ROUND_AMOUNT');
    riskScore += 15;
  }

  // 8. Check if amount is suspiciously high
  if (amount >= config.suspiciousAmountThreshold) {
    reasons.push(`High value transfer requires review (${formatCurrency(amount)})`);
    flags.push('HIGH_VALUE');
    riskScore += 20;
  }

  // 9. Check self-transfer
  if (fromUserId === toUserId) {
    reasons.push('Self-transfer detected');
    flags.push('SELF_TRANSFER');
    riskScore += 10;
  }

  // 10. Check recipient's account age
  const recipientAge = getUserAge(toUser.created_at);
  if (recipientAge.days < 1) {
    reasons.push('Recipient is a newly created account (< 1 day)');
    flags.push('NEW_RECIPIENT');
    riskScore += 20;
  }

  // 11. Check for circular transfers (A->B->A pattern)
  const recentTransfers = await getRecentTransfers(fromUserId, toUserId, 24);
  if (recentTransfers.length > 0) {
    const circularTransfer = recentTransfers.some(t => 
      (t.from_user_id === toUserId && t.to_user_id === fromUserId)
    );
    if (circularTransfer) {
      reasons.push('Potential circular transfer detected');
      flags.push('CIRCULAR_TRANSFER');
      riskScore += 40;
    }
  }

  // 12. Check user's fraud history
  const fraudHistory = await getUserFraudHistory(fromUserId);
  if (fraudHistory.count > 0) {
    reasons.push(`User has ${fraudHistory.count} previous fraud flag(s)`);
    flags.push('PREVIOUS_FRAUD');
    riskScore += fraudHistory.count * 20;
  }

  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 80) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 25) riskLevel = 'medium';

  const isFraudulent = riskScore >= 80;

  return new FraudDetectionResult(isFraudulent, riskLevel, reasons, flags);
}

// Get user's credit balance
export async function getUserCredit(userId) {
  const creditDoc = await db.collection('user_credits').doc(userId).get();
  
  if (!creditDoc.exists) {
    // Create new credit record
    const initialData = {
      user_id: userId,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await db.collection('user_credits').doc(userId).set(initialData);
    return initialData;
  }

  return creditDoc.data();
}

// Add credit to user
export async function addCredit(userId, amount, description, metadata = {}) {
  const creditRef = db.collection('user_credits').doc(userId);
  
  return await db.runTransaction(async (transaction) => {
    const creditDoc = await transaction.get(creditRef);
    
    if (!creditDoc.exists) {
      throw new Error('User credit account not found');
    }

    const currentData = creditDoc.data();
    const newBalance = currentData.balance + amount;

    transaction.update(creditRef, {
      balance: newBalance,
      total_earned: currentData.total_earned + amount,
      updated_at: new Date().toISOString(),
    });

    // Log transaction
    const transactionRef = db.collection('credit_transactions').doc();
    transaction.set(transactionRef, {
      user_id: userId,
      type: 'credit',
      amount,
      balance_before: currentData.balance,
      balance_after: newBalance,
      description,
      metadata,
      created_at: new Date().toISOString(),
    });

    return {
      newBalance,
      transactionId: transactionRef.id,
    };
  });
}

// Deduct credit from user
export async function deductCredit(userId, amount, description, metadata = {}) {
  const creditRef = db.collection('user_credits').doc(userId);
  
  return await db.runTransaction(async (transaction) => {
    const creditDoc = await transaction.get(creditRef);
    
    if (!creditDoc.exists) {
      throw new Error('User credit account not found');
    }

    const currentData = creditDoc.data();
    
    if (currentData.balance < amount) {
      throw new Error('Insufficient credit balance');
    }

    const newBalance = currentData.balance - amount;

    transaction.update(creditRef, {
      balance: newBalance,
      total_spent: currentData.total_spent + amount,
      updated_at: new Date().toISOString(),
    });

    // Log transaction
    const transactionRef = db.collection('credit_transactions').doc();
    transaction.set(transactionRef, {
      user_id: userId,
      type: 'debit',
      amount,
      balance_before: currentData.balance,
      balance_after: newBalance,
      description,
      metadata,
      created_at: new Date().toISOString(),
    });

    return {
      newBalance,
      transactionId: transactionRef.id,
    };
  });
}

// Transfer credit between users
export async function transferCredit(fromUserId, toUserId, amount, description, metadata = {}) {
  const fromCreditRef = db.collection('user_credits').doc(fromUserId);
  const toCreditRef = db.collection('user_credits').doc(toUserId);
  
  return await db.runTransaction(async (transaction) => {
    const fromCreditDoc = await transaction.get(fromCreditRef);
    const toCreditDoc = await transaction.get(toCreditRef);

    if (!fromCreditDoc.exists) {
      throw new Error('Sender credit account not found');
    }

    if (!toCreditDoc.exists) {
      throw new Error('Recipient credit account not found');
    }

    const fromData = fromCreditDoc.data();
    const toData = toCreditDoc.data();

    if (fromData.balance < amount) {
      throw new Error('Insufficient credit balance');
    }

    const newFromBalance = fromData.balance - amount;
    const newToBalance = toData.balance + amount;

    // Update both accounts
    transaction.update(fromCreditRef, {
      balance: newFromBalance,
      total_spent: fromData.total_spent + amount,
      updated_at: new Date().toISOString(),
    });

    transaction.update(toCreditRef, {
      balance: newToBalance,
      total_earned: toData.total_earned + amount,
      updated_at: new Date().toISOString(),
    });

    // Log transaction
    const transactionRef = db.collection('credit_transactions').doc();
    transaction.set(transactionRef, {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      type: 'transfer',
      amount,
      balance_before: fromData.balance,
      balance_after: newFromBalance,
      description,
      metadata,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    return {
      fromNewBalance: newFromBalance,
      toNewBalance: newToBalance,
      transactionId: transactionRef.id,
    };
  });
}

// Get daily transfer statistics
export async function getDailyTransferStats(userId, date = new Date()) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const transactionsSnapshot = await db.collection('credit_transactions')
    .where('from_user_id', '==', userId)
    .where('type', '==', 'transfer')
    .where('created_at', '>=', startOfDay.toISOString())
    .where('created_at', '<', endOfDay.toISOString())
    .get();

  let totalAmount = 0;
  let count = 0;
  let lastTransfer = null;

  transactionsSnapshot.forEach(doc => {
    const data = doc.data();
    totalAmount += data.amount;
    count++;
    if (!lastTransfer || data.created_at > lastTransfer) {
      lastTransfer = data.created_at;
    }
  });

  return { totalAmount, count, lastTransfer };
}

// Get hourly transfer statistics
export async function getHourlyTransferStats(userId, date = new Date()) {
  const startOfHour = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
  const endOfHour = new Date(startOfHour);
  endOfHour.setHours(endOfHour.getHours() + 1);

  const transactionsSnapshot = await db.collection('credit_transactions')
    .where('from_user_id', '==', userId)
    .where('type', '==', 'transfer')
    .where('created_at', '>=', startOfHour.toISOString())
    .where('created_at', '<', endOfHour.toISOString())
    .get();

  return {
    count: transactionsSnapshot.size,
  };
}

// Get recent transfers between users
export async function getRecentTransfers(fromUserId, toUserId, hours = 24) {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const transactionsSnapshot = await db.collection('credit_transactions')
    .where('type', '==', 'transfer')
    .where('created_at', '>=', since.toISOString())
    .get();

  const transfers = [];
  transactionsSnapshot.forEach(doc => {
    const data = doc.data();
    if ((data.from_user_id === fromUserId && data.to_user_id === toUserId) ||
        (data.from_user_id === toUserId && data.to_user_id === fromUserId)) {
      transfers.push({
        id: doc.id,
        ...data,
      });
    }
  });

  return transfers;
}

// Get user's fraud history
export async function getUserFraudHistory(userId) {
  const alertsSnapshot = await db.collection('fraud_alerts')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();

  const alerts = [];
  alertsSnapshot.forEach(doc => {
    alerts.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  return {
    count: alerts.length,
    alerts,
  };
}

// Log fraud alert
export async function logFraudAlert(userId, transactionId, fraudResult, metadata = {}) {
  const alertRef = db.collection('fraud_alerts').doc();
  
  const alertData = {
    user_id: userId,
    transaction_id: transactionId,
    risk_level: fraudResult.riskLevel,
    is_fraudulent: fraudResult.isFraudulent,
    reasons: fraudResult.reasons,
    flags: fraudResult.flags,
    should_block: fraudResult.shouldBlock,
    requires_review: fraudResult.requiresReview,
    metadata,
    status: fraudResult.shouldBlock ? 'blocked' : 'pending_review',
    reviewed: false,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  await alertRef.set(alertData);

  // Also log to fraud_log for analytics
  const logRef = db.collection('fraud_log').doc();
  await logRef.set({
    ...alertData,
    action_taken: fraudResult.shouldBlock ? 'blocked' : 'flagged',
  });

  return alertRef.id;
}

// Helper: Get user age in days
function getUserAge(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return { days, hours };
}

// Helper: Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export { FRAUD_CONFIG };
