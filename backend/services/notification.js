import nodemailer from 'nodemailer';
import { db } from '../config/firebase.js';

// Email transporter cache
let transporter = null;
let lastSettingsCheck = 0;

/**
 * Get email settings from database
 */
async function getEmailSettings() {
  const now = Date.now();
  
  // Cache settings for 5 minutes
  if (transporter && (now - lastSettingsCheck) < 5 * 60 * 1000) {
    return { transporter, settings: true };
  }

  const settingsDoc = await db.collection('settings').doc('email').get();
  
  if (!settingsDoc.exists || !settingsDoc.data().enabled) {
    return { transporter: null, settings: null };
  }

  const settings = settingsDoc.data();

  transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port || 587,
    secure: settings.smtp_secure || false,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });

  lastSettingsCheck = now;

  return { transporter, settings };
}

/**
 * Get notification preferences from database
 */
async function getNotificationPreferences() {
  const settingsDoc = await db.collection('settings').doc('notifications').get();
  
  if (!settingsDoc.exists) {
    return {
      whatsapp_enabled: true,
      email_enabled: true,
      low_balance_alert: true,
      expiring_soon_alert: true,
    };
  }

  return settingsDoc.data();
}

/**
 * Send low balance alert email (internal function)
 */
async function sendLowBalanceAlertEmail({
  email,
  user_id,
  current_balance,
  required_amount,
  deficit,
  plan_label,
  days_until_expiry,
  subscription_end,
  transporter,
  settings,
}) {
  try {
    const expiryDate = new Date(subscription_end).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const frontendUrl = await getFrontendUrl();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      padding: 32px;
      color: #fff;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 24px;
    }
    .alert-box {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .alert-title {
      color: #fbbf24;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .balance-info {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
    }
    .balance-label {
      color: #94a3b8;
    }
    .balance-value {
      font-weight: 600;
    }
    .warning { color: #fca5a5; }
    .cta-button {
      display: inline-block;
      background: #3b82f6;
      color: #fff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🛡️ VPN Access Manager</div>
    
    <div class="alert-box">
      <div class="alert-title">⚠️ Low Balance Alert</div>
      <p>Your credit balance is insufficient for auto-renewal. Please top-up to avoid service interruption.</p>
    </div>

    <div class="balance-info">
      <div class="balance-row">
        <span class="balance-label">Current Balance:</span>
        <span class="balance-value warning">${formatCurrency(current_balance)}</span>
      </div>
      <div class="balance-row">
        <span class="balance-label">Required for ${plan_label}:</span>
        <span class="balance-value">${formatCurrency(required_amount)}</span>
      </div>
      <div class="balance-row">
        <span class="balance-label">Deficit:</span>
        <span class="balance-value warning">${formatCurrency(deficit)}</span>
      </div>
      <div class="balance-row">
        <span class="balance-label">Subscription Expires:</span>
        <span class="balance-value ${days_until_expiry <= 3 ? 'warning' : ''}">${expiryDate} (${days_until_expiry} days)</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${frontendUrl}/wallet" class="cta-button">Top Up Now</a>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} VPN Access Manager. All rights reserved.</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: settings.smtp_from || settings.smtp_user,
      to: email,
      subject: '⚠️ Low Balance Alert - VPN Auto-Renewal',
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Low balance alert sent to ${email}`);
    return true;
  } catch (error) {
    console.error('[Email] Send low balance alert error:', error.message);
    return false;
  }
}

/**
 * Get frontend URL from settings or default
 */
async function getFrontendUrl() {
  try {
    const settingsDoc = await db.collection('settings').doc('general').get();
    if (settingsDoc.exists) {
      return settingsDoc.data().app_url || 'http://localhost:3001';
    }
  } catch (error) {
    // Ignore error
  }
  return 'http://localhost:3001';
}

/**
 * Send low balance alert (Email + WhatsApp)
 */
export async function sendLowBalanceAlert({
  email,
  user_id,
  current_balance,
  required_amount,
  deficit,
  plan,
  plan_label,
  days_until_expiry,
  subscription_end,
}) {
  try {
    const preferences = await getNotificationPreferences();
    let sentCount = 0;

    // Send WhatsApp if enabled
    if (preferences.whatsapp_enabled !== false) {
      try {
        const { getUserWhatsApp, sendLowBalanceAlertWhatsApp } = await import('./whatsapp.js');
        const whatsapp = await getUserWhatsApp(user_id);
        
        if (whatsapp) {
          const sent = await sendLowBalanceAlertWhatsApp({
            user_id,
            whatsapp,
            current_balance,
            required_amount,
            deficit,
            plan_label,
            days_until_expiry,
            subscription_end,
          });
          if (sent) sentCount++;
        }
      } catch (waError) {
        console.error('[Notification] WhatsApp error:', waError.message);
      }
    }

    // Send Email if enabled
    if (preferences.email_enabled !== false) {
      try {
        const { transporter, settings } = await getEmailSettings();
        
        if (transporter && settings) {
          const sent = await sendLowBalanceAlertEmail({
            email,
            user_id,
            current_balance,
            required_amount,
            deficit,
            plan_label,
            days_until_expiry,
            subscription_end,
            transporter,
            settings,
          });
          if (sent) sentCount++;
        }
      } catch (emailError) {
        console.error('[Notification] Email error:', emailError.message);
      }
    }

    // Log notification
    await logNotification({
      user_id,
      type: 'low_balance_alert',
      status: sentCount > 0 ? 'sent' : 'failed',
      channels: {
        whatsapp: preferences.whatsapp_enabled !== false,
        email: preferences.email_enabled !== false,
      },
      sent_count: sentCount,
      data: {
        current_balance,
        required_amount,
        deficit,
        plan,
        days_until_expiry,
        subscription_end,
      },
    });

    return sentCount > 0;
  } catch (error) {
    console.error('[Notification] Send low balance alert error:', error.message);
    return false;
  }
}

/**
 * Log notification to database
 */
async function logNotification({ user_id, type, status, channels, sent_count, data, error, reason }) {
  try {
    await db.collection('notifications').add({
      user_id,
      type,
      status,
      channels: channels || {},
      sent_count: sent_count || 0,
      error: error || null,
      reason: reason || null,
      data: data || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Notification] Log error:', error.message);
  }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default { 
  sendLowBalanceAlert,
  getEmailSettings,
  getNotificationPreferences,
};
