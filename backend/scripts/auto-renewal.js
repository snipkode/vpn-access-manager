/**
 * Auto-renewal Cron Job
 * 
 * This script checks for users with auto-renewal enabled
 * and deducts credit from their balance to extend subscription.
 * 
 * Run this daily via cron: 0 2 * * * (at 2 AM daily)
 */

import { db } from '../config/firebase.js';
import { sendLowBalanceAlert } from '../services/notification.js';

const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
  yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
};

/**
 * Get billing settings from database
 */
async function getBillingSettings() {
  const settingsDoc = await db.collection('settings').doc('billing').get();
  
  if (!settingsDoc.exists) {
    return {
      low_balance_days: 5,
      auto_renewal_enabled: true,
    };
  }

  return settingsDoc.data();
}

async function processAutoRenewals() {
  console.log('[Auto-Renewal] Starting auto-renewal process...');
  
  try {
    // Get billing settings from database
    const billingSettings = await getBillingSettings();
    const LOW_BALANCE_CHECK_DAYS = billingSettings.low_balance_days || 5;
    
    console.log(`[Auto-Renewal] Low balance threshold: ${LOW_BALANCE_CHECK_DAYS} days`);
  
    // Get all users with auto-renewal enabled
    const usersSnapshot = await db.collection('users')
      .where('auto_renewal_enabled', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('[Auto-Renewal] No users with auto-renewal enabled');
      return;
    }

    console.log(`[Auto-Renewal] Found ${usersSnapshot.size} users with auto-renewal enabled`);

    const now = new Date();
    let processed = 0;
    let success = 0;
    let failed = 0;
    let insufficientBalance = 0;
    let lowBalanceAlerts = 0;

    for (const userDoc of usersSnapshot.docs) {
      processed++;
      const userData = userDoc.data();
      const userId = userDoc.id;

      try {
        // Check if subscription is expiring soon (within 3 days) or already expired
        const subscriptionEnd = userData.subscription_end 
          ? new Date(userData.subscription_end) 
          : null;
        
        const daysUntilExpiry = subscriptionEnd 
          ? Math.floor((subscriptionEnd - now) / (1000 * 60 * 60 * 24)) 
          : -999;

        // Get user's preferred plan
        const preferredPlan = userData.auto_renewal_plan || 'monthly';
        const planInfo = PLANS[preferredPlan] || PLANS.monthly;
        const requiredAmount = planInfo.price;

        // Check user's credit balance
        const currentBalance = userData.credit_balance || 0;

        // LOW BALANCE ALERT: Check if balance is insufficient and subscription ending soon
        if (currentBalance < requiredAmount && daysUntilExpiry <= LOW_BALANCE_CHECK_DAYS && daysUntilExpiry > -30) {
          const deficit = requiredAmount - currentBalance;
          
          console.log(
            `[Low Balance Alert] ${userData.email}: ` +
            `balance ${currentBalance} < required ${requiredAmount}, ` +
            `deficit ${deficit}, expires in ${daysUntilExpiry} days`
          );

          // Send low balance notification
          try {
            await sendLowBalanceAlert({
              user_id: userId,
              email: userData.email,
              current_balance: currentBalance,
              required_amount: requiredAmount,
              deficit,
              plan: preferredPlan,
              plan_label: planInfo.label,
              days_until_expiry: daysUntilExpiry,
              subscription_end: subscriptionEnd?.toISOString(),
            });
            lowBalanceAlerts++;
          } catch (notifError) {
            console.error(`[Low Balance Alert] Failed to send notification to ${userData.email}:`, notifError.message);
          }

          // Continue to next user (don't process renewal yet)
          if (daysUntilExpiry > 3) {
            console.log(`[Auto-Renewal] Skipping ${userData.email} - expires in ${daysUntilExpiry} days (not yet time)`);
            continue;
          }
        }

        // Process if expiring within 3 days or already expired
        if (daysUntilExpiry > 3 && subscriptionEnd) {
          console.log(`[Auto-Renewal] Skipping ${userData.email} - expires in ${daysUntilExpiry} days`);
          continue;
        }

        // Check balance again for auto-renewal
        if (currentBalance < requiredAmount) {
          console.log(
            `[Auto-Renewal] Insufficient balance for ${userData.email}: ` +
            `needed ${requiredAmount}, has ${currentBalance}`
          );
          insufficientBalance++;

          // Record failed attempt
          await db.collection('auto_renewal_logs').add({
            user_id: userId,
            user_email: userData.email,
            status: 'failed_insufficient_balance',
            plan: preferredPlan,
            required_amount: requiredAmount,
            current_balance: currentBalance,
            days_until_expiry: daysUntilExpiry,
            attempted_at: new Date().toISOString(),
          });

          // Optionally disable auto-renewal after failed attempt
          // await userDoc.ref.update({ auto_renewal_enabled: false });
          continue;
        }

        // Process auto-renewal
        const newBalance = currentBalance - requiredAmount;

        // Calculate new subscription end date
        let newSubscriptionEnd = subscriptionEnd && subscriptionEnd > now 
          ? new Date(subscriptionEnd) 
          : now;
        
        newSubscriptionEnd.setDate(newSubscriptionEnd.getDate() + planInfo.duration);

        // Update user
        await userDoc.ref.update({
          credit_balance: newBalance,
          subscription_end: newSubscriptionEnd.toISOString(),
          subscription_plan: preferredPlan,
          vpn_enabled: true,
          updated_at: new Date().toISOString(),
        });

        // Record transaction
        const transactionRef = db.collection('credit_transactions').doc();
        await transactionRef.set({
          user_id: userId,
          type: 'auto_renewal',
          amount: requiredAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: `Auto-renewal: ${planInfo.label}`,
          plan: preferredPlan,
          duration_days: planInfo.duration,
          new_subscription_end: newSubscriptionEnd.toISOString(),
          created_at: new Date().toISOString(),
        });

        // Log success
        await db.collection('auto_renewal_logs').add({
          user_id: userId,
          user_email: userData.email,
          status: 'success',
          plan: preferredPlan,
          amount_charged: requiredAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          previous_subscription_end: subscriptionEnd?.toISOString() || null,
          new_subscription_end: newSubscriptionEnd.toISOString(),
          days_until_expiry: daysUntilExpiry,
          attempted_at: new Date().toISOString(),
        });

        console.log(
          `[Auto-Renewal] Success for ${userData.email}: ` +
          `charged ${requiredAmount}, new balance ${newBalance}, ` +
          `subscription extended to ${newSubscriptionEnd.toISOString()}`
        );

        success++;

      } catch (error) {
        console.error(`[Auto-Renewal] Error processing ${userData.email}:`, error.message);
        failed++;

        // Log error
        await db.collection('auto_renewal_logs').add({
          user_id: userId,
          user_email: userData.email,
          status: 'error',
          error_message: error.message,
          attempted_at: new Date().toISOString(),
        });
      }
    }

    console.log(
      `[Auto-Renewal] Process completed: ` +
      `${processed} processed, ${success} successful, ` +
      `${failed} failed, ${insufficientBalance} insufficient balance, ` +
      `${lowBalanceAlerts} low balance alerts sent`
    );

  } catch (error) {
    console.error('[Auto-Renewal] Fatal error:', error.message);
  }
}

// Run if executed directly
const isMainModule = process.argv[1]?.includes('auto-renewal.js');

if (isMainModule) {
  processAutoRenewals()
    .then(() => {
      console.log('[Auto-Renewal] Process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Auto-Renewal] Unhandled error:', error);
      process.exit(1);
    });
}

// Export for use in other modules or schedulers
export { processAutoRenewals };
