/**
 * Test: Simulate Payment Submit
 * 
 * Test what the API receives when submitting payment
 */

import { db } from '../config/firebase.js';

async function testPaymentSubmit() {
  console.log('🧪 Testing Payment Submit Flow\n');
  console.log('===========================================\n');

  // 1. Get plans from API perspective
  console.log('1️⃣ GET /api/payment-settings/config response:');
  const settingsDoc = await db.collection('payment_settings').doc('config').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};

  const defaultPlans = [
    { id: 'monthly', label: 'Monthly', price: 50000, duration: 30 },
    { id: 'quarterly', label: 'Quarterly', price: 135000, duration: 90 },
    { id: 'yearly', label: 'Yearly', price: 480000, duration: 365 },
  ];

  const plans = settings.plans || defaultPlans;

  console.log('   Plans returned to frontend:');
  plans.forEach(plan => {
    console.log(`      - id: "${plan.id}", label: "${plan.label}", price: ${plan.price}`);
  });

  // 2. Check hardcoded PLANS in billing.js
  console.log('\n2️⃣ Hardcoded PLANS in backend/routes/billing.js:');
  const PLANS = {
    monthly: { price: 50000, duration: 30, label: 'Monthly' },
    quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
    yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
  };

  Object.entries(PLANS).forEach(([key, value]) => {
    console.log(`      - "${key}": price=${value.price}, duration=${value.duration}`);
  });

  // 3. Test validation
  console.log('\n3️⃣ Testing plan validation:');
  
  const testPlans = ['monthly', 'quarterly', 'yearly', 'Monthly', 'QUARTERLY', 'invalid'];
  
  testPlans.forEach(planId => {
    const planInfo = PLANS[planId];
    const isValid = !!planInfo;
    console.log(`      - "${planId}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });

  // 4. Check what frontend sends
  console.log('\n4️⃣ Frontend PaymentForm.js sends:');
  console.log('   formData.append("plan", selectedPlan)');
  console.log('   where selectedPlan = plan.id from API response');
  console.log('   Expected values: "monthly", "quarterly", "yearly"');

  // 5. Verify match
  console.log('\n5️⃣ Verification:');
  const allMatch = plans.every(plan => PLANS[plan.id] !== undefined);
  console.log(`   All frontend plans match backend PLANS: ${allMatch ? '✅ YES' : '❌ NO'}`);

  if (!allMatch) {
    console.log('\n⚠️  MISMATCH DETECTED!');
    console.log('   Frontend plans that backend does not recognize:');
    plans.forEach(plan => {
      if (!PLANS[plan.id]) {
        console.log(`      - "${plan.id}"`);
      }
    });
  }

  console.log('\n============================================');
  console.log('\n💡 CONCLUSION:');
  console.log('   If frontend sends plan.id = "monthly", "quarterly", or "yearly",');
  console.log('   backend should accept it (case-sensitive!).');
  console.log('\n   Common issues:');
  console.log('   - Case mismatch: "Monthly" vs "monthly"');
  console.log('   - Whitespace: "monthly " vs "monthly"');
  console.log('   - Different IDs: "plan_monthly" vs "monthly"');
  console.log('\n');

  process.exit(0);
}

testPaymentSubmit();
