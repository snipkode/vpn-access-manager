import cron from 'node-cron';
import { db } from '../config/firebase.js';
import { emailNotifications, getTransporter, getEmailConfig } from '../services/email.js';

// Store scheduled jobs
const scheduledJobs = new Map();
let cronConfig = null;

// Get cron configuration from Firestore
export async function getCronConfig() {
  try {
    const settingsDoc = await db.collection('cron_settings').doc('config').get();
    if (settingsDoc.exists) {
      const config = settingsDoc.data();
      console.log('[Cron] Using Firestore cron configuration');
      return config;
    }
  } catch (error) {
    console.log('[Cron] Firestore not available, using default configuration');
  }

  // Default configuration
  console.log('[Cron] Using default cron configuration');
  return {
    enabled: true,
    daily_summary_schedule: '0 8 * * *',
    expiry_check_schedule: '0 9 * * *',
    expired_check_schedule: '0 10 * * *',
    expiry_reminder_days: [7, 3, 1],
  };
}

// Initialize all cron jobs
export async function initializeCronJobs(config = null) {
  console.log('[Cron] Initializing scheduled jobs...');

  // Check if email is configured
  if (!getTransporter()) {
    console.log('[Cron] Email not configured, skipping cron jobs initialization');
    return;
  }

  cronConfig = config || await getCronConfig();

  if (!cronConfig.enabled) {
    console.log('[Cron] Cron jobs disabled in configuration');
    return;
  }

  // Stop existing jobs if any
  stopCronJobs();

  // Job 1: Check subscription expiring (schedule from Firestore)
  const expiringCheckJob = cron.schedule(cronConfig.expiry_check_schedule, async () => {
    console.log('[Cron] Running subscription expiry check...');
    for (const days of cronConfig.expiry_reminder_days || [7, 3, 1]) {
      await checkExpiringSubscriptions(days);
    }
  });

  // Job 2: Check expired subscriptions (schedule from Firestore)
  const expiredJob = cron.schedule(cronConfig.expired_check_schedule, async () => {
    console.log('[Cron] Running expired subscription check...');
    await checkExpiredSubscriptions();
  });

  // Job 3: Send daily summary to admin (schedule from Firestore)
  const adminSummaryJob = cron.schedule(cronConfig.daily_summary_schedule, async () => {
    console.log('[Cron] Running daily admin summary...');
    await sendAdminDailySummary();
  });

  // Store jobs
  scheduledJobs.set('expiringCheck', expiringCheckJob);
  scheduledJobs.set('expired', expiredJob);
  scheduledJobs.set('adminSummary', adminSummaryJob);

  console.log('[Cron] All scheduled jobs initialized with config:', cronConfig);
}

// Reload cron jobs (for dynamic updates)
export async function reloadCronJobs() {
  console.log('[Cron] Reloading cron jobs...');
  cronConfig = await getCronConfig();
  await initializeCronJobs(cronConfig);
}

// Check subscriptions expiring in X days
async function checkExpiringSubscriptions(daysThreshold) {
  try {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysThreshold);
    targetDate.setHours(23, 59, 59, 999);

    // Get users with VPN enabled and subscription ending soon
    const usersSnapshot = await db.collection('users')
      .where('vpn_enabled', '==', true)
      .where('subscription_end', '>', now.toISOString())
      .where('subscription_end', '<=', targetDate.toISOString())
      .get();

    let emailCount = 0;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      
      // Calculate days remaining
      const expiryDate = new Date(user.subscription_end);
      const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      // Only send if days remaining matches threshold
      if (daysRemaining !== daysThreshold) continue;

      // Get user email from Firebase Auth or use stored email
      const userEmail = user.email;
      if (!userEmail) continue;

      // Send reminder email
      const sent = await emailNotifications.notifySubscriptionExpiring(
        userEmail,
        user,
        daysRemaining
      );

      if (sent) {
        emailCount++;
        console.log(`[Cron] Sent expiry reminder to ${userEmail} (${daysRemaining} days)`);
      }

      // Add delay to avoid rate limiting
      await sleep(1000);
    }

    console.log(`[Cron] Sent ${emailCount} expiry reminders (${daysThreshold} days)`);
  } catch (error) {
    console.error('[Cron] Error checking expiring subscriptions:', error.message);
  }
}

// Check expired subscriptions
async function checkExpiredSubscriptions() {
  try {
    const now = new Date();

    // Get users with expired subscriptions
    const usersSnapshot = await db.collection('users')
      .where('vpn_enabled', '==', true)
      .where('subscription_end', '<', now.toISOString())
      .get();

    let emailCount = 0;
    let disabledCount = 0;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const userEmail = user.email;

      if (!userEmail) continue;

      // Send expired notification
      const sent = await emailNotifications.notifySubscriptionExpired(
        userEmail,
        user
      );

      if (sent) {
        emailCount++;
        console.log(`[Cron] Sent expired notification to ${userEmail}`);
      }

      // Disable VPN access for expired subscriptions
      await db.collection('users').doc(doc.id).update({
        vpn_enabled: false,
        updated_at: new Date().toISOString(),
      });
      disabledCount++;

      console.log(`[Cron] Disabled VPN for ${userEmail} (expired: ${user.subscription_end})`);

      // Add delay to avoid rate limiting
      await sleep(1000);
    }

    console.log(`[Cron] Sent ${emailCount} expired notifications, disabled ${disabledCount} users`);
  } catch (error) {
    console.error('[Cron] Error checking expired subscriptions:', error.message);
  }
}

// Send daily summary to admin
async function sendAdminDailySummary() {
  try {
    const notificationEmail = process.env.SMTP_NOTIFICATION_EMAIL || process.env.SMTP_USER;
    if (!notificationEmail) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get payments from yesterday
    const paymentsSnapshot = await db.collection('payments')
      .where('created_at', '>=', yesterday.toISOString())
      .where('created_at', '<', today.toISOString())
      .get();

    let pending = 0, approved = 0, rejected = 0, totalRevenue = 0;

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'pending') pending++;
      else if (data.status === 'approved') {
        approved++;
        totalRevenue += data.amount;
      }
      else if (data.status === 'rejected') rejected++;
    });

    // Get current pending count
    const pendingSnapshot = await db.collection('payments')
      .where('status', '==', 'pending')
      .get();

    const currentPending = pendingSnapshot.size;

    // Get subscription expiring soon count
    const expiringSnapshot = await db.collection('users')
      .where('vpn_enabled', '==', true)
      .where('subscription_end', '>', now.toISOString())
      .where('subscription_end', '<=', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .get();

    const expiringCount = expiringSnapshot.size;

    // Send summary email
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-card { background: white; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .stat-label { color: #6B7280; font-size: 14px; }
          .alert-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📊 Daily Billing Summary</h2>
            <p>${yesterday.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div class="content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${pending}</div>
                <div class="stat-label">New Payments (Pending)</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${approved}</div>
                <div class="stat-label">Approved</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${rejected}</div>
                <div class="stat-label">Rejected</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${formatCurrency(totalRevenue)}</div>
                <div class="stat-label">Revenue</div>
              </div>
            </div>

            ${currentPending > 0 ? `
            <div class="alert-box">
              <strong>⚠️ Action Required:</strong> You have ${currentPending} pending payment(s) awaiting review.
            </div>
            ` : ''}

            ${expiringCount > 0 ? `
            <div class="alert-box" style="background: #DBEAFE; border-left-color: #3B82F6;">
              <strong>📅 Subscription Alerts:</strong> ${expiringCount} subscription(s) expiring within 7 days.
            </div>
            ` : ''}

            <p style="margin-top: 20px;">
              <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000'}/admin/billing" 
                 style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Go to Admin Dashboard
              </a>
            </p>
          </div>
          <div class="footer">
            <p>VPN Access System - Automated Daily Report</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { sendEmail } = await import('../services/email.js');
    await sendEmail(
      notificationEmail,
      `📊 Daily Billing Summary - ${yesterday.toLocaleDateString('id-ID')}`,
      html
    );

    console.log('[Cron] Daily summary sent to admin');
  } catch (error) {
    console.error('[Cron] Error sending daily summary:', error.message);
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Stop all cron jobs
export function stopCronJobs() {
  scheduledJobs.forEach((job, name) => {
    job.stop();
    console.log(`[Cron] Stopped job: ${name}`);
  });
  scheduledJobs.clear();
}
