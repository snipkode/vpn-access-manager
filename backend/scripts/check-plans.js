/**
 * Check: Plans in payment_settings
 */

import { db } from '../config/firebase.js';

async function checkPlans() {
  console.log('🔍 Checking plans in payment_settings/config...\n');

  try {
    const doc = await db.collection('payment_settings').doc('config').get();
    const data = doc.exists ? doc.data() : {};

    console.log('payment_settings/config:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n📋 Plans:');
    if (data.plans && Array.isArray(data.plans)) {
      data.plans.forEach(plan => {
        console.log(`  - ${plan.id}: ${plan.label} (Rp ${plan.price}, ${plan.duration} days)`);
      });
    } else {
      console.log('  No plans array in database');
      console.log('  Using default: monthly, quarterly, yearly');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

checkPlans();
