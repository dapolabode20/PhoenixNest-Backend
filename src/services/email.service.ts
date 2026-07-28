import config from '../config/config';

export interface IEmailService {
  sendOtpEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }>;
  sendPasswordResetEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }>;
}

// Minutes remaining until expiry, rounded up so "expires in 0 minutes"
// never shows for a code that's still briefly valid.
function minutesUntil(expiresAt: Date): number {
  return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60000));
}

// SMTP_FROM_ADDRESS is stored as "Name <email>" for Nodemailer's `from`
// field; Brevo's API wants the name and email as separate properties.
function parseSender(fromAddress: string): { name?: string; email: string } {
  const match = fromAddress.match(/^\s*(.*?)\s*<(.+)>\s*$/);
  const name = match?.[1]?.replace(/^"|"$/g, '');
  const email = match?.[2];
  if (!email) return { email: fromAddress };
  return name ? { name, email } : { email };
}

// Sends via Brevo's transactional email HTTP API instead of raw SMTP.
class EmailService implements IEmailService {
  private async send(to: string, subject: string, text: string, html: string): Promise<{ err?: Error }> {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': config.brevoApiKey
        },
        body: JSON.stringify({
          sender: parseSender(config.smtpFromAddress),
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html
        })
      });

      if (!response.ok) {
        const body = await response.text();
        return { err: new Error(`Brevo API request failed (${response.status}): ${body}`) };
      }

      return {};
    } catch (error) {
      return { err: error as Error };
    }
  }

  async sendOtpEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }> {
    const minutes = minutesUntil(expiresAt);
    return this.send(
      to,
      'Your Phoenix Nest verification code',
      `Your verification code is ${otp}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>`
    );
  }

  async sendPasswordResetEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }> {
    const minutes = minutesUntil(expiresAt);
    return this.send(
      to,
      'Reset your Phoenix Nest password',
      `Your password reset code is ${otp}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      `<p>Your password reset code is <strong>${otp}</strong>.</p><p>It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>`
    );
  }
}

export const emailService = new EmailService();

// --- Previous Nodemailer/SMTP implementation, kept in case we revert ---
// Retired because SMTP connections from Render/Vercel were hanging for
// ~2 minutes and ultimately failing: Brevo's Authorized IPs restriction
// blocks unrecognized IPs, and cloud hosts' outbound IPs aren't static/
// listed. The Brevo HTTP API above isn't subject to that same restriction
// path and fails fast with a clear error instead of hanging.
//
// import nodemailer from 'nodemailer';
//
// class SmtpEmailService implements IEmailService {
//   private transporter = nodemailer.createTransport({
//     host: config.smtpHost,
//     port: config.smtpPort,
//     secure: config.smtpPort === 465,
//     auth: {
//       user: config.smtpUser,
//       pass: config.smtpPass
//     }
//   });
//
//   async sendOtpEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }> {
//     const minutes = minutesUntil(expiresAt);
//     try {
//       await this.transporter.sendMail({
//         from: config.smtpFromAddress,
//         to,
//         subject: 'Your Phoenix Nest verification code',
//         text: `Your verification code is ${otp}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
//         html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>`
//       });
//       return {};
//     } catch (error) {
//       return { err: error as Error };
//     }
//   }
//
//   async sendPasswordResetEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }> {
//     const minutes = minutesUntil(expiresAt);
//     try {
//       await this.transporter.sendMail({
//         from: config.smtpFromAddress,
//         to,
//         subject: 'Reset your Phoenix Nest password',
//         text: `Your password reset code is ${otp}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
//         html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>`
//       });
//       return {};
//     } catch (error) {
//       return { err: error as Error };
//     }
//   }
// }
