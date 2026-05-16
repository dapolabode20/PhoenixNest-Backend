import { Schema, model, Document } from 'mongoose';

export interface IInvestorProfile extends Document {
  userId: Schema.Types.ObjectId;
  professionalEmail: string;
  firmName: string;
  entityId: string;
  identificationNumber: string;
  identificationDocumentUrl: string;
  lookingOutFor?: string;
  stagePreference?: string;
  yearsOfInvestmentExperience?: string;
  investorType?: string;
  communicationPreference?: string;
}

const InvestorProfileSchema = new Schema<IInvestorProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    professionalEmail: { type: String, required: true },
    firmName: { type: String, required: true },
    entityId: { type: String, required: true },
    identificationNumber: { type: String, required: true },
    identificationDocumentUrl: { type: String, required: true },
    lookingOutFor: { type: String },
    stagePreference: { type: String },
    yearsOfInvestmentExperience: { type: String },
    investorType: { type: String },
    communicationPreference: { type: String }
  },
  {
    timestamps: true
  }
);

export const InvestorProfile = model<IInvestorProfile>('InvestorProfile', InvestorProfileSchema);