/**
 * Cloud Function: Sync Credit Balance on Payment Approval
 * Trigger: When a payment document is updated with status='approved'
 * Purpose: Ensure user credit_balance is always in sync
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.syncCreditBalanceOnPayment = functions.firestore
  .document('payments/{paymentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger on status change to 'approved'
    if (before.status !== 'approved' && after.status === 'approved') {
      console.log(`💰 Payment ${context.params.paymentId} approved, syncing balance...`);

      const userId = after.user_id;
      const amount = after.amount;
      const isTopup = after.plan === 'topup' || !after.duration_days || after.duration_days === 0;

      if (isTopup) {
        try {
          const userRef = db.collection('users').doc(userId);
          
          await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            
            if (!userDoc.exists) {
              throw new Error(`User ${userId} not found`);
            }

            const currentBalance = userDoc.data().credit_balance || 0;
            const newBalance = currentBalance + amount;

            transaction.update(userRef, {
              credit_balance: newBalance,
              last_balance_sync: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          console.log(`✅ Balance synced: user=${userId}, newBalance=${newBalance}`);
        } catch (error) {
          console.error(`❌ Balance sync failed:`, error);
          throw error;
        }
      }
    }

    return null;
  });
