import { Message, IMessage } from '../models/message.model';
import { Result } from '../helpers/result.helpers';
import { Model, Document } from 'mongoose';

interface IMessageRepository {
  createMessage(data: Partial<IMessage>): Promise<Result<IMessage>>;
  findByConversation(conversationId: string, limit: number, before?: Date): Promise<Result<IMessage[]>>;
  findLatest(conversationId: string): Promise<Result<IMessage | null>>;
  countUnread(conversationId: string, readerUserId: string): Promise<Result<number>>;
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

  // Returns messages newest first, using cursor pagination: without `before`
  // you get the most recent messages; to load older ones, pass the createdAt
  // of the oldest message already loaded. (Page numbers would show duplicates
  // when new messages arrive while the user is scrolling back through history.)
  async findByConversation(conversationId: string, limit: number, before?: Date): Promise<Result<IMessage[]>> {
    try {
      const filter = before ? { conversationId, createdAt: { $lt: before } } : { conversationId };
      const messages = await this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
      return Result.value(messages);
    } catch (error) {
      return Result.error(new Error('Failed to find messages for conversation'));
    }
  }

  async findLatest(conversationId: string): Promise<Result<IMessage | null>> {
    try {
      const message = await this.model.findOne({ conversationId }).sort({ createdAt: -1 }).exec();
      return Result.value(message);
    } catch (error) {
      return Result.error(new Error('Failed to find latest message'));
    }
  }

  // Same rule as markConversationRead below: messages the reader did NOT
  // send and hasn't read yet.
  async countUnread(conversationId: string, readerUserId: string): Promise<Result<number>> {
    try {
      const count = await this.model
        .countDocuments({ conversationId, senderId: { $ne: readerUserId }, readAt: null })
        .exec();
      return Result.value(count);
    } catch (error) {
      return Result.error(new Error('Failed to count unread messages'));
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
