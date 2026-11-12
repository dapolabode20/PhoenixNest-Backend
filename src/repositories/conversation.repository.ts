import { Conversation, IConversation } from '../models/conversation.model';
import { Result } from '../helpers/result.helpers';
import { Model, Document } from 'mongoose';

interface IConversationRepository {
  findOrCreateBetween(userIdA: string, userIdB: string): Promise<Result<IConversation>>;
  findById(id: string): Promise<Result<IConversation | null>>;
  findForUser(userId: string, limit: number, page: number): Promise<Result<IConversation[]>>;
  countForUser(userId: string): Promise<Result<number>>;
  recordNewMessage(conversationId: string, sentAt: Date): Promise<Result<IConversation | null>>;
  markReported(conversationId: string): Promise<Result<IConversation | null>>;
}

export class ConversationRepository implements IConversationRepository {
  constructor(
    private readonly model: Model<IConversation & Document>
  ) { }

  // Finds the existing 1:1 conversation between these two users, or creates
  // one if it doesn't exist yet. This is what "start a conversation" means —
  // it's always safe to call, never creates a duplicate.
  async findOrCreateBetween(userIdA: string, userIdB: string): Promise<Result<IConversation>> {
    try {
      const existing = await this.model
        .findOne({ participants: { $all: [userIdA, userIdB] } })
        .exec();
      if (existing) {
        return Result.value(existing);
      }

      const conversation = new this.model({ participants: [userIdA, userIdB] });
      await conversation.save();
      return Result.value(conversation);
    } catch (error) {
      return Result.error(new Error('Failed to find or create conversation'));
    }
  }

  async findById(id: string): Promise<Result<IConversation | null>> {
    try {
      const conversation = await this.model.findById(id).exec();
      return Result.value(conversation);
    } catch (error) {
      return Result.error(new Error('Failed to find conversation by id'));
    }
  }

  // Most-recently-active conversations first, so the list reads like an inbox.
  // Participants are populated with name and role so the inbox can show who
  // each conversation is with; every other lookup uses plain ids.
  async findForUser(userId: string, limit: number, page: number): Promise<Result<IConversation[]>> {
    try {
      const conversations = await this.model
        .find({ participants: userId })
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('participants', 'firstName lastName profile')
        .exec();
      return Result.value(conversations);
    } catch (error) {
      return Result.error(new Error('Failed to find conversations for user'));
    }
  }

  async countForUser(userId: string): Promise<Result<number>> {
    try {
      const count = await this.model.countDocuments({ participants: userId }).exec();
      return Result.value(count);
    } catch (error) {
      return Result.error(new Error('Failed to count conversations for user'));
    }
  }

  async recordNewMessage(conversationId: string, sentAt: Date): Promise<Result<IConversation | null>> {
    try {
      const conversation = await this.model
        .findByIdAndUpdate(
          conversationId,
          { $inc: { messageCount: 1 }, $set: { lastMessageAt: sentAt } },
          { new: true }
        )
        .exec();
      return Result.value(conversation);
    } catch (error) {
      return Result.error(new Error('Failed to record new message on conversation'));
    }
  }

  async markReported(conversationId: string): Promise<Result<IConversation | null>> {
    try {
      const conversation = await this.model
        .findByIdAndUpdate(conversationId, { reported: true }, { new: true })
        .exec();
      return Result.value(conversation);
    } catch (error) {
      return Result.error(new Error('Failed to mark conversation as reported'));
    }
  }
}

export const conversationRepository = new ConversationRepository(Conversation);
