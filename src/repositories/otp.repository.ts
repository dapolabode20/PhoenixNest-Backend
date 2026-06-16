import { OtpRecord } from '../dtos/otp.dto';
import { Result } from '../helpers/result.helpers';
import { Otp } from '../models/otp.model';

interface IOtpRepository {
  findOtpByEmail(email: string): Promise<Result<OtpRecord | null>>;
  saveOtp(otpData: OtpRecord): Promise<Result<OtpRecord>>;
  updateOtp(email: string, otpData: Partial<OtpRecord>): Promise<Result<OtpRecord | null>>;
  deleteOtp(email: string): Promise<Result<boolean>>;
}

export class OtpRepository implements IOtpRepository {
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findOtpByEmail(email: string): Promise<Result<OtpRecord | null>> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const otp = await Otp.findOne({ email: normalizedEmail }).lean().exec();

      if (!otp) {
        return Result.value(null);
      }

      return Result.value({
        email: otp.email,
        otp: otp.otp,
        expiresAt: otp.expiresAt
      });
    } catch (error) {
      return Result.error(new Error('Failed to find OTP by email'));
    }
  }

  async saveOtp(otpData: OtpRecord): Promise<Result<OtpRecord>> {
    try {
      const normalizedEmail = this.normalizeEmail(otpData.email);
      const otp = await Otp.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          otp: otpData.otp,
          expiresAt: otpData.expiresAt
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
        //  { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      )
        .lean()
        .exec();

      return Result.value({
        email: otp!.email,
        otp: otp!.otp,
        expiresAt: otp!.expiresAt
      });
    } catch (error) {
      return Result.error(new Error('Failed to save OTP record'));
    }
  }

  async updateOtp(email: string, otpData: Partial<OtpRecord>): Promise<Result<OtpRecord | null>> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const existing = await Otp.findOne({ email: normalizedEmail }).lean().exec();
      if (!existing) {
        return Result.value(null);
      }

      const updated = await Otp.findOneAndUpdate(
        { email: normalizedEmail },
        {
          ...(otpData.email ? { email: this.normalizeEmail(otpData.email) } : {}),
          ...(otpData.otp ? { otp: otpData.otp } : {}),
          ...(otpData.expiresAt ? { expiresAt: otpData.expiresAt } : {})
        },
        { new: true }
      )
        .lean()
        .exec();

      if (!updated) {
        return Result.value(null);
      }

      return Result.value({
        email: updated.email,
        otp: updated.otp,
        expiresAt: updated.expiresAt
      });
    } catch (error) {
      return Result.error(new Error('Failed to update OTP record'));
    }
  }

  async deleteOtp(email: string): Promise<Result<boolean>> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const result = await Otp.deleteMany({ email: normalizedEmail }).exec();
      return Result.value(result.deletedCount > 0);
    } catch (error) {
      return Result.error(new Error('Failed to delete OTP record'));
    }
  }
}

export const otpRepository = new OtpRepository();