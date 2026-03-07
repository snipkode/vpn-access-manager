/**
 * Script: Add Credit Balance
 * 
 * Add credit balance to a user for testing purposes
 */

import { db } from '../config/firebase.js';

async function addCreditBalance() {
  console.log('💰 Add Credit Balance Script\n');
  console.log('============================================\n');

  try {
    // List users
    const usersSnapshot = await db.collection('users').get();
    
    console.log('📊 Available Users:\n');
    const users = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      users.push({
        id: doc.id,
        email: user.email,
        balance: user.credit_balance || 0,
      });
    });

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Balance: Rp ${user.balance.toLocaleString('id-ID')}`);
    });

    // Prompt for user selection
    console.log('\n\n💡 Usage:');
    console.log('   node scripts/add-credit-balance.js <user_email> <amount>');
    console.log('\n   Example:');
    console.log('   node scripts/add-credit-balance.js admin@system.local 100000');
    console.log('\n');

    // Check if arguments provided
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.log('⚠️  Please provide user_email and amount');
      process.exit(1);
    }

    const [email, amountStr] = args;
    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) {
      console.log('❌ Invalid amount');
      process.exit(1);
    }

    // Find user
    const userDoc = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userDoc.empty) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = userDoc.docs[0];
    const userId = user.id;
    const userData = user.data();
    const currentBalance = userData.credit_balance || 0;
    const newBalance = currentBalance + amount;

    console.log(`\n✅ Adding credit to: ${email}`);
    console.log(`   Current Balance: Rp ${currentBalance.toLocaleString('id-ID')}`);
    console.log(`   Adding: Rp ${amount.toLocaleString('id-ID')}`);
    console.log(`   New Balance: Rp ${newBalance.toLocaleString('id-ID')}`);

    // Update user balance
    await db.collection('users').doc(userId).update({
      credit_balance: newBalance,
      updated_at: new Date().toISOString(),
    });

    // Create credit transaction record
    const transactionRef = db.collection('credit_transactions').doc();
    await transactionRef.set({
      user_id: userId,
      type: 'credit',
      amount: amount,
      status: 'completed',
      description: 'Manual credit addition for testing',
      created_at: new Date().toISOString(),
    });

    console.log('\n✅ Credit added successfully!');
    console.log('   Transaction ID:', transactionRef.id);
    console.log('\n   User can now transfer credit to other users.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

addCreditBalance();
