/**
 * Debug: Credit Transfer Issue
 * 
 * Check why transfer is being blocked
 */

import { db } from '../config/firebase.js';

async function debugTransfer() {
  console.log('🔍 Debugging Credit Transfer Issue\n');
  console.log('============================================\n');

  try {
    // Get all users
    console.log('📊 Users in system:');
    const usersSnapshot = await db.collection('users').get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      users.push({
        id: doc.id,
        email: user.email,
        name: user.name,
        credit_balance: user.credit_balance || 0,
        created_at: user.created_at,
        role: user.role,
      });
    });

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Balance: Rp ${user.credit_balance?.toLocaleString('id-ID') || 0}`);
      console.log(`   Created: ${user.created_at || 'unknown'}`);
      console.log(`   Role: ${user.role}`);
      
      // Check if new user
      if (user.created_at) {
        const createdDate = new Date(user.created_at);
        const now = new Date();
        const ageDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        console.log(`   Account Age: ${ageDays} days ${ageDays < 7 ? '⚠️ (NEW USER)' : '✅'}`);
      }
    });

    // Check recent transfers
    console.log('\n\n📜 Recent Credit Transactions:');
    const transactionsSnapshot = await db.collection('credit_transactions')
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();

    if (transactionsSnapshot.empty) {
      console.log('   No transactions found');
    } else {
      transactionsSnapshot.forEach(doc => {
        const tx = doc.data();
        console.log(`\n   ${tx.type || 'transfer'}`);
        console.log(`   Amount: Rp ${tx.amount?.toLocaleString('id-ID')}`);
        console.log(`   From: ${tx.from_user_id}`);
        console.log(`   To: ${tx.to_user_id}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Created: ${tx.created_at}`);
        if (tx.fraud_check) {
          console.log(`   Fraud Check: ${tx.fraud_check.risk_level}`);
          console.log(`   Flags: ${tx.fraud_check.flags?.join(', ')}`);
        }
        if (tx.blocked_reason) {
          console.log(`   Blocked Reason: ${tx.blocked_reason}`);
        }
      });
    }

    // Fraud config
    console.log('\n\n🛡️  Fraud Config:');
    const configDoc = await db.collection('fraud_config').doc('settings').get();
    const config = configDoc.exists ? configDoc.data() : {};
    
    const defaultConfig = {
      maxTransferAmount: 1000000,
      maxDailyTransfer: 5000000,
      maxTransfersPerDay: 10,
      minTransferInterval: 5, // minutes
      suspiciousAmountThreshold: 500000,
      new_userDays: 7,
      new_userMaxTransfer: 100000,
      maxTransfersPerHour: 3,
    };

    const finalConfig = { ...defaultConfig, ...config };

    Object.entries(finalConfig).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n\n✅ Debug complete!');
    console.log('\n💡 Common Issues:');
    console.log('   1. Insufficient balance - User needs credit_balance >= transfer amount');
    console.log('   2. New user (< 7 days) - Limited to Rp 100,000 max transfer');
    console.log('   3. Transfer too soon - Wait 5 minutes between transfers');
    console.log('   4. Self-transfer - Cannot transfer to yourself');
    console.log('   5. Recipient not found - Email must exist in system');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
}

debugTransfer();
