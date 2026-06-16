import { Model, Document } from 'mongoose';
import { StartUpProfile, IStartUpProfile } from '../models/startUpProfile.model';
import { Result } from '../helpers/result.helpers';

interface IStartUpProfileRepository {
  createProfile(data: Partial<IStartUpProfile>): Promise<Result<IStartUpProfile>>;
  findByUserId(userId: string): Promise<Result<IStartUpProfile | null>>;
  findByUserIdWithUser(userId: string): Promise<Result<IStartUpProfile | null>>;
  findById(id: string): Promise<Result<IStartUpProfile | null>>;
  findAll(): Promise<Result<IStartUpProfile[]>>;
  updateByUserId(userId: string, data: Partial<IStartUpProfile>): Promise<Result<IStartUpProfile | null>>;
  deleteByUserId(userId: string): Promise<Result<boolean>>;
}

export class StartUpProfileRepository implements IStartUpProfileRepository {
  constructor(
    private readonly model: Model<IStartUpProfile & Document>
  ) { }

  async createProfile(data: Partial<IStartUpProfile>): Promise<Result<IStartUpProfile>> {
    try {
      const profile = new this.model(data);
      await profile.save();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to create startup profile'));
    }
  }

  async findByUserId(userId: string): Promise<Result<IStartUpProfile | null>> {
    try {
      const profile = await this.model.findOne({ userId } as any).exec();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to find startup profile by userId'));
    }
  }

  async findByUserIdWithUser(userId: string): Promise<Result<IStartUpProfile | null>> {
    try {
      const profile = await this.model
        .findOne({ userId } as any)
        .populate('userId', 'firstName lastName middleName email profile')
        .exec();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to find startup profile by userId with user populated'));
    }
  }

  async findById(id: string): Promise<Result<IStartUpProfile | null>> {
    try {
      const profile = await this.model.findById(id).exec();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to find startup profile by id'));
    }
  }

  async findAll(): Promise<Result<IStartUpProfile[]>> {
    try {
      const profiles = await this.model.find().exec();
      return Result.value(profiles);
    } catch (error) {
      return Result.error(new Error('Failed to find startup profiles'));
    }
  }

  async updateByUserId(userId: string, data: Partial<IStartUpProfile>): Promise<Result<IStartUpProfile | null>> {
    try {
      const profile = await this.model
        .findOneAndUpdate({ userId } as any, data, { new: true })
        .exec();
      return Result.value(profile);
    } catch (error) {
      return Result.error(new Error('Failed to update startup profile'));
    }
  }

  async deleteByUserId(userId: string): Promise<Result<boolean>> {
    try {
      const result = await this.model.deleteOne({ userId } as any).exec();
      return Result.value(result.deletedCount === 1);
    } catch (error) {
      return Result.error(new Error('Failed to delete startup profile'));
    }
  }
}

export const startUpProfileRepository = new StartUpProfileRepository(StartUpProfile);