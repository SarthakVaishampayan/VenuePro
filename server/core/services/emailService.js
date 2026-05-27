// ============================================================
// EMAIL SERVICE — Transactional Emails
// ============================================================
// Handles all outgoing emails with configurable transport.
// In development, emails are logged to console.
// In production, uses SMTP/SendGrid transport.

import { logger } from '../config/logger.js';

// Use environment variables for email configuration
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@venuepro.com';
const FROM_NAME = process.env.FROM_NAME || 'VenuePro';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let transporter = null;

/**
 * Lazily initialize the nodemailer transporter.
 * Falls back to console-only mode if nodemailer is not installed
 * or SMTP credentials are not configured.
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  try {
    const nodemailer = await import('nodemailer');

    if (SMTP_HOST && SMTP_USER) {
      transporter = nodemailer.default.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
      logger.info('[EmailService] SMTP transport configured');
    } else {
      // Development mode — log emails to console using JSON transport
      transporter = nodemailer.default.createTransport({
        jsonTransport: true
      });
      logger.info('[EmailService] Using JSON transport (emails logged to console)');
    }
  } catch (err) {
    logger.warn(`[EmailService] nodemailer not available: ${err.message}. Emails will be logged only.`);
    transporter = { sendMail: async (opts) => { logger.info(`[Email Mock] ${JSON.stringify(opts)}`); return { messageId: 'mock' }; } };
  }

  return transporter;
};

class EmailService {
  /**
   * Send a raw email
   */
  async sendRaw({ to, subject, text, html }) {
    try {
      const transport = await getTransporter();
      const info = await transport.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject,
        text,
        html: html || text
      });
      logger.debug(`[EmailService] Email sent to ${to}: ${subject} (id: ${info.messageId})`);
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Welcome email for new tenant owners
   */
  async sendWelcome({ to, name, tenantName, tenantCode }) {
    const subject = `Welcome to VenuePro — ${tenantName} is ready!`;
    const text = `Hi ${name || 'there'},

Welcome to VenuePro! Your venue "${tenantName}" has been created and is ready to use.

Your portal is available at: ${APP_URL}/owner/login
Your tenant code: ${tenantCode}

Next steps:
1. Log in to your owner portal
2. Complete the onboarding wizard
3. Add your resources (tables, courts, turfs, etc.)
4. Start taking bookings!

If you have any questions, check our Knowledge Base or contact support.

Best,
The VenuePro Team`;

    return this.sendRaw({ to, subject, text });
  }

  /**
   * Password reset email
   */
  async sendPasswordReset({ to, name, resetLink }) {
    const subject = 'Reset Your VenuePro Password';
    const text = `Hi ${name || 'there'},

You requested a password reset for your VenuePro account.

Click the link below to reset your password (valid for 1 hour):
${resetLink}

If you didn't request this, you can safely ignore this email.

Best,
The VenuePro Team`;

    return this.sendRaw({ to, subject, text });
  }

  /**
   * Payment receipt email
   */
  async sendPaymentReceipt({ to, customerName, tenantName, amount, mode, date, reference }) {
    const subject = `Payment Receipt — ₹${amount} paid to ${tenantName}`;
    const text = `Hi ${customerName || 'Valued Customer'},

Thank you for your payment!

Receipt Summary:
  Venue: ${tenantName}
  Amount: ₹${amount}
  Mode: ${mode}
  Date: ${date}
  Reference: ${reference || '—'}

This is an auto-generated receipt from VenuePro.

Best,
The VenuePro Team`;

    return this.sendRaw({ to, subject, text });
  }

  /**
   * Due reminder email
   */
  async sendDueReminder({ to, customerName, tenantName, amount, dueDate }) {
    const subject = `Payment Reminder — ₹${amount} due at ${tenantName}`;
    const text = `Hi ${customerName || 'Valued Customer'},

This is a friendly reminder that you have an outstanding balance of ₹${amount} at ${tenantName}.

Due Date: ${dueDate || 'Immediate'}

Please settle this at your earliest convenience.

Best,
The VenuePro Team`;

    return this.sendRaw({ to, subject, text });
  }

  /**
   * Trial expiry warning email
   */
  async sendTrialExpiry({ to, name, tenantName, expiryDate }) {
    const subject = `Your VenuePro Trial Expires Soon`;
    const text = `Hi ${name || 'there'},

Your free trial for "${tenantName}" expires on ${new Date(expiryDate).toLocaleDateString()}.

To continue using VenuePro without interruption, please subscribe to a plan before your trial ends.

Visit your settings page to choose a plan: ${APP_URL}/owner/settings

Best,
The VenuePro Team`;

    return this.sendRaw({ to, subject, text });
  }

  /**
   * Send a notification email (generic)
   */
  async sendNotification({ to, name, title, message }) {
    const subject = title;
    const text = `Hi ${name || 'there'},

${message}

Best,
The VenuePro Team`;

    return this.sendRaw({ to, subject, text });
  }
}

export default new EmailService();
