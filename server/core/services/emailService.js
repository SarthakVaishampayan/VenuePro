// ============================================================
// EMAIL SERVICE — Transactional Emails
// ============================================================
// Handles all outgoing emails using the Resend HTTP API.
// In development, emails are logged to console.
// In production, uses the Resend REST API (port 443).
// This avoids SMTP port blocking issues on cloud providers.

import { logger } from '../config/logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@venuepro.live';
const FROM_NAME = process.env.FROM_NAME || 'VenuePro';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Send email via Resend HTTP API.
 * Falls back to console-only mode if no API key is configured.
 */
async function sendViaResend({ to, subject, text, html }) {
  if (!RESEND_API_KEY) {
    logger.info(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return true;
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: [to],
      subject,
      text,
      html: html || text,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Resend API error (${response.status}): ${body.message || JSON.stringify(body)}`);
  }

  logger.debug(`[EmailService] Email sent to ${to}: ${subject} (id: ${body.id})`);
  return true;
}

class EmailService {
  /**
   * Send a raw email
   */
  async sendRaw({ to, subject, text, html }) {
    try {
      return await sendViaResend({ to, subject, text, html });
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

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;text-align:center;vertical-align:middle;font-size:28px;line-height:56px;">🎉</td></tr>
          </table>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:16px 0 4px;">Welcome to VenuePro!</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;line-height:1.5;">Your venue is ready to go</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 40px;">
          <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 20px;">Hi <strong>${name || 'there'}</strong>,</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Welcome to <strong>VenuePro</strong>! Your venue <strong style="color:#7c3aed;">${tenantName}</strong> has been created and is ready to use.
          </p>

          <!-- Info Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6ff;border-radius:10px;border:1px solid #e8e0ff;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Portal</span><br/>
                    <a href="${APP_URL}/owner/login" style="color:#7c3aed;font-size:14px;text-decoration:none;">${APP_URL}/owner/login</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tenant Code</span><br/>
                    <span style="color:#1e293b;font-size:18px;font-weight:700;font-family:monospace;">${tenantCode}</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Next Steps</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:10px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px;height:24px;background:#7c3aed;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;line-height:24px;color:#ffffff;font-weight:700;">1</td>
                  <td style="padding-left:10px;color:#475569;font-size:14px;">Log in to your <strong>owner portal</strong></td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding-bottom:10px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px;height:24px;background:#7c3aed;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;line-height:24px;color:#ffffff;font-weight:700;">2</td>
                  <td style="padding-left:10px;color:#475569;font-size:14px;">Complete the <strong>onboarding wizard</strong></td>
                </tr>
              </table>
            </td></tr>
            <tr><td style="padding-bottom:10px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px;height:24px;background:#7c3aed;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;line-height:24px;color:#ffffff;font-weight:700;">3</td>
                  <td style="padding-left:10px;color:#475569;font-size:14px;">Add your <strong>resources</strong> (tables, courts, turfs, etc.)</td>
                </tr>
              </table>
            </td></tr>
            <tr><td>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px;height:24px;background:#7c3aed;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;line-height:24px;color:#ffffff;font-weight:700;">4</td>
                  <td style="padding-left:10px;color:#475569;font-size:14px;">Start <strong>taking bookings!</strong></td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:8px;padding:12px 32px;text-align:center;">
                    <a href="${APP_URL}/owner/login" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:block;">Go to Your Portal →</a>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Need help? Check our <a href="${APP_URL}/owner/settings" style="color:#7c3aed;text-decoration:none;">Knowledge Base</a> or contact support.</p>
          <p style="color:#cbd5e1;font-size:11px;margin:0;">© ${new Date().getFullYear()} VenuePro. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return this.sendRaw({ to, subject, text, html });
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

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;text-align:center;vertical-align:middle;font-size:28px;line-height:56px;">🔐</td></tr>
          </table>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:16px 0 4px;">Reset Your Password</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;line-height:1.5;">Click the button below to reset your password</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:32px 40px;">
          <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi <strong>${name || 'there'}</strong>,</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
            We received a request to reset the password for your <strong>VenuePro</strong> account. 
            Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:8px;padding:14px 36px;text-align:center;">
                    <a href="${resetLink}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block;">Reset Password →</a>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Fallback link -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6ff;border-radius:8px;border:1px solid #e8e0ff;margin-bottom:24px;">
            <tr><td style="padding:16px;">
              <p style="color:#64748b;font-size:12px;margin:0 0 6px;font-weight:600;">Button not working? Copy this link:</p>
              <p style="color:#7c3aed;font-size:12px;margin:0;word-break:break-all;line-height:1.5;">${resetLink}</p>
            </td></tr>
          </table>

          <!-- Warning -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
            <tr><td style="padding:14px;text-align:center;">
              <p style="color:#dc2626;font-size:13px;margin:0;line-height:1.5;">
                ⚠️ If you didn't request this password reset, please ignore this email. Your account is safe.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">This is an automated message from <strong>VenuePro</strong>. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return this.sendRaw({ to, subject, text, html });
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
