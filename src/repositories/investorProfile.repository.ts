import { Model, Document, Types } from 'mongoose';
import { InvestorProfile, IInvestorProfile } from '../models/investorProfile.model';
import { Result } from '../helpers/result.helpers';

interface IInvestorProfileRepository {
  createProfile(data: Partial<IInvestorProfile>): Promise<Result<IInvestorProfile>>;
  findByUserId(userId: string): Promise<Result<IInvestorProfile | null>>;
  findById(id: string): Promise<Result<IInvestorProfile | null>>;
  findAll(): Promise<Result<IInvestorProfile[]>>;
  updateByUserId(userId: string, data: Partial<IInvestorProfile>): Promise<Result<IInvestorProfile | null>>;
  deleteByUserId(userId: string): Promise<Result<boolean>>;
}

export class InvestorProfileRepository implements IInvestorProfileRepository {
  constructor(
    private readonly model: Model<IInvestorProfile & Document>
  ) { }

  async createProfile(data: Partial<IInvestorProfile>): Promise<Result<IInvestorProfile>> {
    try {
      const profile = new this.model(data);
      await profile.save();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to create investor profile'));
    }
  }

  async findByUserId(userId: string): Promise<Result<IInvestorProfile | null>> {
    try {
      const profile = await this.model.findOne({ userId } as any).exec(); // Use userId directly
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to find investor profile by userId'));
    }
  }

  async findById(id: string): Promise<Result<IInvestorProfile | null>> {
    try {
      const profile = await this.model.findById(id).exec();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to find investor profile by id'));
    }
  }

  async findAll(): Promise<Result<IInvestorProfile[]>> {
    try {
      const profiles = await this.model.find().exec();
      return Result.value(profiles);
    } catch (error) {
      return Result.error(new Error('Failed to find investor profiles'));
    }
  }

  async updateByUserId(userId: string, data: Partial<IInvestorProfile>): Promise<Result<IInvestorProfile | null>> {
    try {
      const profile = await this.model
        .findOneAndUpdate({ userId } as any, data, { new: true }) // Use userId directly
        .exec();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to update investor profile'));
    }
  }

  async deleteByUserId(userId: string): Promise<Result<boolean>> {
    try {
      const result = await this.model.deleteOne({ userId } as any).exec();
      return Result.value(result.deletedCount === 1);
    } catch (error) {
      return Result.error(new Error('Failed to delete investor profile'));
    }
  }
}

export const investorProfileRepository = new InvestorProfileRepository(InvestorProfile);