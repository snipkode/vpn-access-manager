/**
 * Script: Sync User Credit Balance
 * Purpose: Fix users whose credit_balance is not in sync with their payment history
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncUserCreditBalance() {
  console.log('🔄 Sync User Credit Balance Script\n');

  // Get all users
  const usersSnapshot = await db.collection('users').get();
  
  let updated = 0;
  let errors = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    try {
      // Get all approved topup payments for this user
      const paymentsSnapshot = await db.collection('payments')
        .where('user_id', '==', userId)
        .where('status', '==', 'approved')
        .get();

      let totalTopup = 0;

      paymentsSnapshot.forEach(paymentDoc => {
        const payment = paymentDoc.data();
        const isTopup = payment.plan === 'topup' || !payment.duration_days || payment.duration_days === 0;
        
        if (isTopup) {
          totalTopup += payment.amount;
        }
      });

      // Get all credit transactions
      const transactionsSnapshot = await db.collection('credit_transactions')
        .where('user_id', '==', userId)
        .get();

      let transactionTotal = 0;

      transactionsSnapshot.forEach(txDoc => {
        const tx = txDoc.data();
        if (tx.type === 'topup' || tx.type === 'credit') {
          transactionTotal += tx.amount;
        } else if (tx.type === 'deduction' || tx.type === 'transfer') {
          transactionTotal -= tx.amount;
        }
      });

      const currentBalance = userData.credit_balance || 0;
      const expectedBalance = transactionTotal;

      // If balance mismatch, update it
      if (currentBalance !== expectedBalance) {
        console.log(`📊 User: ${userData.email}`);
        console.log(`   Current balance: Rp ${currentBalance.toLocaleString('id-ID')}`);
        console.log(`   Expected balance: Rp ${expectedBalance.toLocaleString('id-ID')}`);
        console.log(`   Difference: Rp ${(expectedBalance - currentBalance).toLocaleString('id-ID')}`);

        await userDoc.ref.update({
          credit_balance: expectedBalance,
          last_balance_sync: new Date().toISOString(),
        });

        console.log(`   ✅ Updated!\n`);
        updated++;
      }
    } catch (error) {
      console.error(`❌ Error syncing user ${userId}:`, error.message);
      errors++;
    }
  }

  console.log('============================================');
  console.log(`✅ Sync complete: ${updated} updated, ${errors} errors`);
  
  process.exit(0);
}

syncUserCreditBalance().catch(console.error);
