import nodemailer from 'nodemailer';
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

// Wraps a Nodemailer transport configured for Brevo SMTP. Callers only ever
// talk to this interface, so swapping providers later means changing this
// file only — no call sites need to change.
class EmailService implements IEmailService {
  private transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  async sendOtpEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }> {
    const minutes = minutesUntil(expiresAt);
    try {
      await this.transporter.sendMail({
        from: config.smtpFromAddress,
        to,
        subject: 'Your Phoenix Nest verification code',
        text: `Your verification code is ${otp}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>`
      });
      return {};
    } catch (error) {
      return { err: error as Error };
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, expiresAt: Date): Promise<{ err?: Error }> {
    const minutes = minutesUntil(expiresAt);
    try {
      await this.transporter.sendMail({
        from: config.smtpFromAddress,
        to,
        subject: 'Reset your Phoenix Nest password',
        text: `Your password reset code is ${otp}. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>`
      });
      return {};
    } catch (error) {
      return { err: error as Error };
    }
  }
}

export const emailService = new EmailService();
