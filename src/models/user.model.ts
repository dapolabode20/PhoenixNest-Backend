import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  profile: 'business_owner' | 'investor';
  shortBio?: string;
  location?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    profile: { type: String, enum: ['business_owner', 'investor'], required: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', UserSchema);