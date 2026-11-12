import { Message, IMessage } from '../models/message.model';
import { Result } from '../helpers/result.helpers';
import { Model, Document } from 'mongoose';

interface IMessageRepository {
  createMessage(data: Partial<IMessage>): Promise<Result<IMessage>>;
  findByConversation(conversationId: string, limit: number, page: number): Promise<Result<IMessage[]>>;
  markConversationRead(conversationId: string, readerUserId: string): Promise<Result<number>>;
}

export class MessageRepository implements IMessageRepository {
  constructor(
    private readonly model: Model<IMessage & Document>
  ) { }

  async createMessage(data: Partial<IMessage>): Promise<Result<IMessage>> {
    try {
      const message = new this.model(data);
      await message.save();
      return Result.value(message);
    } catch (error) {
      return Result.error(new Error('Failed to create message'));
    }
  }

  // Newest first, page 1 = most recent page. The frontend reverses this
  // for display (oldest-at-top, like every chat app), but newest-first is
  // the natural order for "load more / older messages" pagination.
  async findByConversation(conversationId: string, limit: number, page: number): Promise<Result<IMessage[]>> {
    try {
      const messages = await this.model
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
      return Result.value(messages);
    } catch (error) {
      return Result.error(new Error('Failed to find messages for conversation'));
    }
  }

  // Marks every message in the conversation that this reader did NOT send
  // and hasn't already read, as read now. Returns how many were updated.
  async markConversationRead(conversationId: string, readerUserId: string): Promise<Result<number>> {
    try {
      const result = await this.model
        .updateMany(
          { conversationId, senderId: { $ne: readerUserId }, readAt: null },
          { $set: { readAt: new Date() } }
        )
        .exec();
      return Result.value(result.modifiedCount);
    } catch (error) {
      return Result.error(new Error('Failed to mark conversation as read'));
    }
  }
}

export const messageRepository = new MessageRepository(Message);
