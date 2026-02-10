import { OtpRecord } from '../dtos/otp.dto';
import { Result } from '../helpers/result.helpers';

export interface IOtpService {
  generateOtp(email: string): Promise<Result<OtpRecord>>;
}

export class OtpService implements IOtpService {
  async generateOtp(email: string): Promise<Result<Omit<OtpRecord, 'id'>>> {
    const otpCodeLength = 6;
    const otpValidityPeriodMinutes = 5;
    const possibleChars = '0123456789';
    let otp = '';
    for (let i = 0; i < otpCodeLength; i++) {
      otp += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
    }
    const expiresAt = new Date(Date.now() + otpValidityPeriodMinutes * 60000);
    const otpRecord: OtpRecord = { email, otp, expiresAt };
    return { value: otpRecord };
  }
}

export const otpService = new OtpService();