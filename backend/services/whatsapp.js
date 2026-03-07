import axios from 'axios';
import { db } from '../config/firebase.js';

/**
 * Log notification to database
 */
async function logNotification(type, status, phone, message, error = null) {
  try {
    await db.collection('notification_logs').add({
      type,
      status,
      phone,
      message,
      error,
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('[WAHA] Failed to log notification:', logError.message);
  }
}

/**
 * Send WhatsApp message via WAHA (WhatsApp HTTP API)
 * @param {string} phone - Phone number (e.g., "628123456789")
 * @param {string} message - Message text
 * @returns {Promise<boolean>}
 */
export async function sendWhatsApp(phone, message) {
  try {
    // Get WAHA settings from database
    const settingsDoc = await db.collection('settings').doc('whatsapp').get();

    if (!settingsDoc.exists) {
      console.warn('[WAHA] Settings not configured in database - skipping WhatsApp notification');
      return false;
    }

    const settings = settingsDoc.data();

    if (!settings.enabled || !settings.api_url || !settings.session_id) {
      console.warn('[WAHA] WAHA not properly configured - skipping WhatsApp notification');
      return false;
    }

    const { api_url, session_id } = settings;

    // Format phone number (remove +, 0, or spaces)
    const formattedPhone = formatPhoneNumber(phone);

    if (!formattedPhone) {
      console.error('[WAHA] Invalid phone number:', phone);
      return false;
    }

    const url = `${api_url}/api/sendText`;

    const response = await axios.post(url, {
      chatId: `${formattedPhone}@c.us`,
      body: message,
      session: session_id,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': settings.api_key || '',
      },
      timeout: 10000,
    });

    if (response.data && response.data.sent) {
      console.log(`[WAHA] Message sent to ${formattedPhone}`);

      // Log notification
      await logNotification('whatsapp', 'sent', formattedPhone, message);
      return true;
    }

    console.error('[WAHA] Failed to send message:', response.data);
    await logNotification('whatsapp', 'failed', formattedPhone, message, response.data);
    return false;

  } catch (error) {
    console.error('[WAHA] Error:', error.message);
    await logNotification('whatsapp', 'error', phone, message, error.message);
    return false;
  }
}

/**
 * Send WhatsApp message with buttons (WAHA interactive message)
 */
export async function sendWhatsAppWithButtons(phone, message, buttons = []) {
  try {
    const settingsDoc = await db.collection('settings').doc('whatsapp').get();
    
    if (!settingsDoc.exists || !settingsDoc.data().enabled) {
      return false;
    }

    const settings = settingsDoc.data();
    const formattedPhone = formatPhoneNumber(phone);

    const url = `${settings.api_url}/api/sendButtons`;
    
    const response = await axios.post(url, {
      chatId: `${formattedPhone}@c.us`,
      body: message,
      buttons: buttons.map(btn => ({
        buttonId: btn.id,
        buttonText: {
          displayText: btn.text,
        },
      })),
      session: settings.session_id,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': settings.api_key || '',
      },
      timeout: 10000,
    });

    if (response.data && response.data.sent) {
      console.log(`[WAHA] Button message sent to ${formattedPhone}`);
      await logNotification('whatsapp', 'sent', formattedPhone, message);
      return true;
    }

    return false;

  } catch (error) {
    console.error('[WAHA] Error sending button message:', error.message);
    return false;
  }
}

/**
 * Send WhatsApp message with image
 */
export async function sendWhatsAppWithImage(phone, message, imageUrl) {
  try {
    const settingsDoc = await db.collection('settings').doc('whatsapp').get();
    
    if (!settingsDoc.exists || !settingsDoc.data().enabled) {
      return false;
    }

    const settings = settingsDoc.data();
    const formattedPhone = formatPhoneNumber(phone);

    const url = `${settings.api_url}/api/sendFile`;
    
    const response = await axios.post(url, {
      chatId: `${formattedPhone}@c.us`,
      file: imageUrl,
      caption: message,
      session: settings.session_id,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': settings.api_key || '',
      },
      timeout: 10000,
    });

    if (response.data && response.data.sent) {
      console.log(`[WAHA] Image message sent to ${formattedPhone}`);
      await logNotification('whatsapp', 'sent', formattedPhone, message);
      return true;
    }

    return false;

  } catch (error) {
    console.error('[WAHA] Error sending image message:', error.message);
    return false;
  }
}

/**
 * Format phone number for WhatsApp
 * - Remove +, 0, spaces, dashes
 * - Add country code if missing (default: 62 for Indonesia)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading +
  cleaned = cleaned.replace(/^\+/, '');

  // Remove leading 0
  cleaned = cleaned.replace(/^0/, '');

  // Add Indonesia country code if missing
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

/**
 * Get user's WhatsApp number from Firestore
 */
export async function getUserWhatsApp(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData.whatsapp || userData.phone || null;
  } catch (error) {
    console.error('[WAHA] Get user WhatsApp error:', error.message);
    return null;
  }
}

/**
 * Send low balance alert via WhatsApp
 */
export async function sendLowBalanceAlertWhatsApp({
  user_id,
  whatsapp,
  current_balance,
  required_amount,
  deficit,
  plan_label,
  days_until_expiry,
  subscription_end,
}) {
  try {
    const expiryDate = new Date(subscription_end).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message = `
⚠️ *LOW BALANCE ALERT*

VPN Access Manager

━━━━━━━━━━━━━━━━━━━━

Your credit balance is insufficient for auto-renewal.

💰 *Balance Breakdown:*
• Current Balance: ${formatCurrency(current_balance)}
• Required (${plan_label}): ${formatCurrency(required_amount)}
• Deficit: ${formatCurrency(deficit)}

📅 *Subscription:*
• Expires: ${expiryDate}
• Days Remaining: ${days_until_expiry} days

━━━━━━━━━━━━━━━━━━━━

Please top-up to avoid service interruption.

Top-up now via:
• Admin Panel
• Bank Transfer
• E-Wallet

Reply INFO for more details.`;

    const sent = await sendWhatsApp(whatsapp, message.trim());
    
    if (sent) {
      console.log(`[WAHA] Low balance alert sent to ${whatsapp}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[WAHA] Send low balance alert error:', error.message);
    return false;
  }
}

/**
 * Send subscription expiring soon alert via WhatsApp
 */
export async function sendExpiringSoonAlertWhatsApp({
  user_id,
  whatsapp,
  days_until_expiry,
  subscription_end,
  plan,
}) {
  try {
    const expiryDate = new Date(subscription_end).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message = `
⏰ *SUBSCRIPTION EXPIRING SOON*

VPN Access Manager

━━━━━━━━━━━━━━━━━━━━

Your VPN subscription will expire in *${days_until_expiry} days*.

📅 *Expiry Date:* ${expiryDate}

━━━━━━━━━━━━━━━━━━━━

To avoid service interruption:
• Renew your subscription
• Ensure sufficient credit for auto-renewal

Contact admin for assistance.`;

    const sent = await sendWhatsApp(whatsapp, message.trim());
    
    if (sent) {
      console.log(`[WAHA] Expiring soon alert sent to ${whatsapp}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[WAHA] Send expiring alert error:', error.message);
    return false;
  }
}

/**
 * Send payment approved notification via WhatsApp
 */
export async function sendPaymentApprovedWhatsApp({
  user_id,
  whatsapp,
  amount,
  plan_label,
  duration_days,
  new_expiry,
}) {
  try {
    const expiryDate = new Date(new_expiry).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message = `
✅ *PAYMENT APPROVED*

VPN Access Manager

━━━━━━━━━━━━━━━━━━━━

Your payment has been approved!

💰 *Payment Details:*
• Amount: ${formatCurrency(amount)}
• Plan: ${plan_label}
• Duration: ${duration_days} days

📅 *New Expiry:* ${expiryDate}

━━━━━━━━━━━━━━━━━━━━

Thank you for your payment!
Your VPN service is now extended.`;

    const sent = await sendWhatsApp(whatsapp, message.trim());
    
    if (sent) {
      console.log(`[WAHA] Payment approved sent to ${whatsapp}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[WAHA] Send payment approved error:', error.message);
    return false;
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
  sendWhatsApp,
  sendWhatsAppWithButtons,
  sendWhatsAppWithImage,
  getUserWhatsApp,
  sendLowBalanceAlertWhatsApp,
  sendExpiringSoonAlertWhatsApp,
  sendPaymentApprovedWhatsApp,
};
