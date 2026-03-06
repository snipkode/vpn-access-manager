import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { db } from '../config/firebase.js';

dotenv.config();

// Email transporter singleton
let transporter = null;
let emailConfig = null;

// Get email configuration from Firestore or .env
export async function getEmailConfig() {
  // Try to get from Firestore first
  try {
    const settingsDoc = await db.collection('email_settings').doc('config').get();
    if (settingsDoc.exists) {
      const config = settingsDoc.data();
      if (config.enabled) {
        console.log('[Email] Using Firestore email configuration');
        return config;
      }
    }
  } catch (error) {
    console.log('[Email] Firestore not available, using .env configuration');
  }

  // Fallback to .env
  console.log('[Email] Using .env email configuration');
  return {
    enabled: true,
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
    smtp_from: process.env.SMTP_FROM || 'VPN Access <noreply@vpnaccess.com>',
    notification_email: process.env.SMTP_NOTIFICATION_EMAIL || process.env.SMTP_USER,
  };
}

// Initialize email transporter
export async function initializeEmailTransporter(config = null) {
  emailConfig = config || await getEmailConfig();

  if (!emailConfig.enabled) {
    console.log('[Email] Email notifications disabled');
    return null;
  }

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = emailConfig;

  if (!smtp_host || !smtp_user || !smtp_pass) {
    console.log('[Email] SMTP not configured, email notifications disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtp_host,
    port: parseInt(smtp_port) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtp_user,
      pass: smtp_pass,
    },
    tls: {
      rejectUnauthorized: false, // For self-signed certificates
    },
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('[Email] SMTP connection failed:', error.message);
    } else {
      console.log('[Email] SMTP connected successfully');
    }
  });

  return transporter;
}

// Reconfigure email transporter (for dynamic updates)
export async function reconfigureEmailTransporter(newConfig) {
  // Stop existing transporter
  if (transporter) {
    transporter.close();
    transporter = null;
  }

  // Initialize with new config
  return await initializeEmailTransporter(newConfig);
}

// Get transporter instance
export function getTransporter() {
  return transporter;
}

// Get current email config
export function getCurrentConfig() {
  return emailConfig;
}

// Email templates
export const emailTemplates = {
  // Payment submitted notification (to admin)
  paymentSubmitted: (payment, userEmail) => ({
    subject: 'New Payment Submission - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6B7280; }
          .value { color: #111827; }
          .action-btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 New Payment Received</h2>
          </div>
          <div class="content">
            <p>A user has submitted a payment proof. Please review and approve/reject.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="label">User Email:</span>
                <span class="value">${userEmail}</span>
              </div>
              <div class="info-row">
                <span class="label">Amount:</span>
                <span class="value">${formatCurrency(payment.amount)}</span>
              </div>
              <div class="info-row">
                <span class="label">Plan:</span>
                <span class="value">${payment.plan_label} (${payment.duration_days} days)</span>
              </div>
              <div class="info-row">
                <span class="label">Bank From:</span>
                <span class="value">${payment.bank_from}</span>
              </div>
              <div class="info-row">
                <span class="label">Transfer Date:</span>
                <span class="value">${new Date(payment.transfer_date).toLocaleDateString('id-ID')}</span>
              </div>
              <div class="info-row">
                <span class="label">Submitted:</span>
                <span class="value">${new Date(payment.created_at).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <p><strong>Notes from user:</strong></p>
            <p><em>${payment.notes || 'No notes'}</em></p>

            <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000'}/admin/payments/${payment.id}" class="action-btn">
              Review Payment
            </a>
          </div>
          <div class="footer">
            <p>This is an automated notification from VPN Access System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Payment approved notification (to user)
  paymentApproved: (payment, daysAdded) => ({
    subject: 'Payment Approved - Subscription Extended',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .success-box { background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6B7280; }
          .value { color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Payment Approved!</h2>
          </div>
          <div class="content">
            <div class="success-box">
              <strong>Your payment has been approved and subscription extended.</strong>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Amount Paid:</span>
                <span class="value">${formatCurrency(payment.amount)}</span>
              </div>
              <div class="info-row">
                <span class="label">Plan:</span>
                <span class="value">${payment.plan_label}</span>
              </div>
              <div class="info-row">
                <span class="label">Days Added:</span>
                <span class="value">${daysAdded} days</span>
              </div>
            </div>

            <p>Thank you for your payment! Your VPN access has been extended.</p>
            <p>You can now connect to our VPN servers using your configured devices.</p>
          </div>
          <div class="footer">
            <p>VPN Access System - Secure Internet Connection</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Payment rejected notification (to user)
  paymentRejected: (payment, reason) => ({
    subject: 'Payment Update - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .warning-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6B7280; }
          .value { color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Payment Update</h2>
          </div>
          <div class="content">
            <div class="warning-box">
              <strong>Your payment submission requires attention.</strong>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Amount:</span>
                <span class="value">${formatCurrency(payment.amount)}</span>
              </div>
              <div class="info-row">
                <span class="label">Plan:</span>
                <span class="value">${payment.plan_label}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <span class="value" style="color: #DC2626;">Rejected</span>
              </div>
            </div>

            <p><strong>Reason:</strong></p>
            <p>${reason || 'Please contact admin for more information.'}</p>

            <p>Please review and resubmit your payment with the correct information.</p>
          </div>
          <div class="footer">
            <p>VPN Access System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Subscription expiry reminder (to user)
  subscriptionExpiring: (user, daysRemaining) => ({
    subject: `Subscription Expiring in ${daysRemaining} Days - Renew Now`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .warning-box { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6B7280; }
          .value { color: #111827; }
          .cta-btn { display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⏰ Subscription Expiring Soon</h2>
          </div>
          <div class="content">
            <div class="warning-box">
              <strong>Your VPN subscription will expire in ${daysRemaining} days!</strong>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Current Plan:</span>
                <span class="value">${user.subscription_plan || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Expiry Date:</span>
                <span class="value">${new Date(user.subscription_end).toLocaleDateString('id-ID')}</span>
              </div>
              <div class="info-row">
                <span class="label">Days Remaining:</span>
                <span class="value" style="color: #EF4444;">${daysRemaining} days</span>
              </div>
            </div>

            <p>Don't lose your secure connection! Renew your subscription now to continue enjoying uninterrupted VPN access.</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/renew" class="cta-btn">
              Renew Now
            </a>
          </div>
          <div class="footer">
            <p>VPN Access System - Secure Internet Connection</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Subscription expired notification (to user)
  subscriptionExpired: (user) => ({
    subject: 'Subscription Expired - Renew to Continue',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .alert-box { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6B7280; }
          .value { color: #111827; }
          .cta-btn { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚫 Subscription Expired</h2>
          </div>
          <div class="content">
            <div class="alert-box">
              <strong>Your VPN subscription has expired.</strong>
            </div>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Previous Plan:</span>
                <span class="value">${user.subscription_plan || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Expired On:</span>
                <span class="value">${new Date(user.subscription_end).toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            <p>Your VPN access has been suspended. Renew your subscription to restore access.</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/renew" class="cta-btn">
              Renew Subscription
            </a>
          </div>
          <div class="footer">
            <p>VPN Access System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Send email function
export async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.log('[Email] Transporter not initialized, skipping email');
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'VPN Access <noreply@vpnaccess.com>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error.message);
    return false;
  }
}

// Email notification functions
export const emailNotifications = {
  // Notify admin of new payment
  notifyPaymentSubmitted: async (payment, userEmail) => {
    const notificationEmail = process.env.SMTP_NOTIFICATION_EMAIL || process.env.SMTP_USER;
    if (!notificationEmail) return false;

    const template = emailTemplates.paymentSubmitted(payment, userEmail);
    return await sendEmail(notificationEmail, template.subject, template.html);
  },

  // Notify user of approved payment
  notifyPaymentApproved: async (userEmail, payment, daysAdded) => {
    const template = emailTemplates.paymentApproved(payment, daysAdded);
    return await sendEmail(userEmail, template.subject, template.html);
  },

  // Notify user of rejected payment
  notifyPaymentRejected: async (userEmail, payment, reason) => {
    const template = emailTemplates.paymentRejected(payment, reason);
    return await sendEmail(userEmail, template.subject, template.html);
  },

  // Notify user of expiring subscription
  notifySubscriptionExpiring: async (userEmail, user, daysRemaining) => {
    const template = emailTemplates.subscriptionExpiring(user, daysRemaining);
    return await sendEmail(userEmail, template.subject, template.html);
  },

  // Notify user of expired subscription
  notifySubscriptionExpired: async (userEmail, user) => {
    const template = emailTemplates.subscriptionExpired(user);
    return await sendEmail(userEmail, template.subject, template.html);
  },
};
