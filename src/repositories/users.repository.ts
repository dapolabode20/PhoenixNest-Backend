import { User, IUser } from '../models/user.model';
import { Result } from '../helpers/result.helpers';
import { Model, Document } from 'mongoose';

interface IUserRepository {
  createUser(userData: Partial<IUser>): Promise<Result<IUser>>;
  deleteUser(email: string): Promise<Result<boolean>>;
  findUserByEmail(email: string): Promise<Result<IUser | null>>;
  findById(id: string): Promise<Result<IUser | null>>;
  findAll(): Promise<Result<IUser[]>>;
  updateUser(email: string, userData: Partial<IUser>): Promise<Result<IUser | null>>;
}

export class UsersRepository implements IUserRepository {
  constructor(
    private readonly model: Model<IUser & Document>
  ) { }
  
  async createUser(userData: Partial<IUser>): Promise<Result<IUser>> {
    try {
      const user = new this.model(userData);
      await user.save();
      return Result.value(user);
    } catch (error) {
      return Result.error(new Error('Failed to create user'));
    }
  }

  async deleteUser(email: string): Promise<Result<boolean>> {
    try {
      const result = await this.model.deleteOne({ email: email.toLowerCase().trim() }).exec();
      return Result.value(result.deletedCount === 1);
    } catch (error) {
      return Result.error(new Error('Failed to delete user'));
    }
  }

  async findUserByEmail(email: string): Promise<Result<IUser | null>> {
    try {
      const user = await this.model.findOne({ email: email.toLowerCase().trim() }).exec();
      return Result.value(user);
    } catch (error) {
      return Result.error(new Error('Failed to find user by email'));
    }
  }

  async findById(id: string): Promise<Result<IUser | null>> {
    try {
      const user = await this.model.findById(id).exec();
      return Result.value(user);
    } catch (error) {
      return Result.error(new Error('Failed to find user by id'));
    }
  }

  async findAll(): Promise<Result<IUser[]>> {
    try {
      const users = await this.model.find().exec();
      return Result.value(users);
    } catch (error) {
      return Result.error(new Error('Failed to find users'));
    }
  }

  async updateUser(email: string, userData: Partial<IUser>): Promise<Result<IUser | null>> {
    try {
      const user = await this.model.findOneAndUpdate({ email: email.toLowerCase().trim() }, userData, { new: true }).exec();
      return Result.value(user);
    } catch (error) {
      return Result.error(new Error('Failed to update user'));
    }
  }
}

export const usersRepository = new UsersRepository(User);