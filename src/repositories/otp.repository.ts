import { OtpRecord } from '../dtos/otp.dto';
import { Result } from '../helpers/result.helpers';

interface IOtpRepository {
  findOtpByEmail(email: string): Promise<Result<OtpRecord | null>>;
  saveOtp(otpData: OtpRecord): Promise<Result<OtpRecord>>;
  updateOtp(email: string, otpData: Partial<OtpRecord>): Promise<Result<OtpRecord | null>>;
  deleteOtp(email: string): Promise<Result<boolean>>;
}

export class OtpRepository implements IOtpRepository {
  private otpStore: Map<string, OtpRecord> = new Map();

  async findOtpByEmail(email: string): Promise<Result<OtpRecord | null>> {
    try {
      const otp = this.otpStore.get(email) || null;
      return { value: otp };
    } catch (error) {
      return Result.error(new Error('Failed to find OTP by email'));
    }
  }

  async saveOtp(otpData: OtpRecord): Promise<Result<OtpRecord>> {
    try {
      this.otpStore.set(otpData.email, otpData);
      return Result.value(otpData);
    } catch (error) {
      return Result.error(new Error('Failed to save OTP record'));
    }
  }

  async updateOtp(email: string, otpData: Partial<OtpRecord>): Promise<Result<OtpRecord | null>> {
    try {
      const existing = this.otpStore.get(email);
      if (!existing) {
        return Result.value(null);
      }
      const updated = { ...existing, ...otpData };
      this.otpStore.set(email, updated);
      return Result.value(updated);
    } catch (error) {
      return Result.error(new Error('Failed to update OTP record'));
    }
  }

  async deleteOtp(email: string): Promise<Result<boolean>> {
    try {
      const deleted = this.otpStore.delete(email);
      return Result.value(deleted);
    } catch (error) {
      return Result.error(new Error('Failed to delete OTP record'));
    }
  }
}

export const otpRepository = new OtpRepository();