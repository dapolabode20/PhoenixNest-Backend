import { Token, IToken } from '../models/token.model';
import { Result } from '../helpers/result.helpers';
import { Model, Document } from 'mongoose';

interface ITokenRepository {
  createToken(data: Partial<IToken>): Promise<Result<IToken>>;
  findById(id: string): Promise<Result<IToken | null>>;
  findByUserId(userId: string): Promise<Result<IToken | null>>;
  findByToken(token: string): Promise<Result<IToken | null>>;
  updateToken(id: string, data: Partial<IToken>): Promise<Result<IToken | null>>;
  deleteById(id: string): Promise<Result<boolean>>;
  deleteByUserId(userId: string): Promise<Result<boolean>>;
}

export class TokenRepository implements ITokenRepository {
  constructor(
    private readonly model: Model<IToken & Document>
  ) { }

  async createToken(data: Partial<IToken>): Promise<Result<IToken>> {
    try {
      const token = new this.model(data);
      await token.save();
      return Result.value(token);
    } catch (error) {
      return Result.error(new Error('Failed to create token'));
    }
  }

  async findById(id: string): Promise<Result<IToken | null>> {
    try {
      const token = await this.model.findById(id).exec();
      return Result.value(token);
    } catch (error) {
      return Result.error(new Error('Failed to find token by id'));
    }
  }

  async findByUserId(userId: string): Promise<Result<IToken | null>> {
    try {
      const token = await this.model.findOne({ userId } as any).exec();
      return Result.value(token);
    } catch (error) {
      return Result.error(new Error('Failed to find token by userId'));
    }
  }

  async findByToken(token: string): Promise<Result<IToken | null>> {
    try {
      const tokenDoc = await this.model.findOne({ token }).exec();
      return Result.value(tokenDoc);
    } catch (error) {
      return Result.error(new Error('Failed to find token by token string'));
    }
  }

  async updateToken(id: string, data: Partial<IToken>): Promise<Result<IToken | null>> {
    try {
      const token = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
      return Result.value(token);
    } catch (error) {
      return Result.error(new Error('Failed to update token'));
    }
  }

  async deleteById(id: string): Promise<Result<boolean>> {
    try {
      const result = await this.model.deleteOne({ _id: id }).exec();
      return Result.value(result.deletedCount === 1);
    } catch (error) {
      return Result.error(new Error('Failed to delete token by id'));
    }
  }

  async deleteByUserId(userId: string): Promise<Result<boolean>> {
    try {
      const result = await this.model.deleteOne({ userId } as any).exec();
      return Result.value(result.deletedCount === 1);
    } catch (error) {
      return Result.error(new Error('Failed to delete token by userId'));
    }
  }
}

export const tokenRepository = new TokenRepository(Token);