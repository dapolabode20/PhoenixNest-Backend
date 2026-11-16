import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]; // exactly 2 user ids
  lastMessageAt?: Date;
  messageCount: number;
  reported: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator: (arr: unknown[]) => arr.length === 2,
        message: 'A conversation must have exactly 2 participants'
      }
    },
    lastMessageAt: { type: Date },
    messageCount: { type: Number, default: 0 },
    reported: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Speeds up "find the conversation between these two users" lookups.
ConversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
