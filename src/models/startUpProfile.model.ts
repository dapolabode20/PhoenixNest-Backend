import { Schema, model, Document } from 'mongoose';

interface ContactInformation {
  personalWebsite?: string;
  phoneNumber?: string;
}

interface Picture {
  teamProfiles?: string;
  productScreenshotsUrl?: string;
}

interface Proof {
  cac?: string;
  financialStatements?: string;
}

export interface IStartUpProfile extends Document {
  userId: Schema.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  companyName: string;
  location: string;
  shortBio: string;
  industry?: string;
  biography?: string;
  areaOfExperience?: string;
  contactInformation?: ContactInformation;
  traction?: string;
  marketSize?: string;
  totalAddressableMarket?: string;
  picture: Picture[];
  proof?: Proof;
  pitchDeckCoverAndTagline?: string;
  visionAndMission?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StartUpProfileSchema = new Schema<IStartUpProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    companyName: { type: String, required: true },
    location: { type: String, required: true },
    shortBio: { type: String, required: true },
    industry: { type: String },
    biography: { type: String },
    areaOfExperience: { type: String },
    contactInformation: {
      personalWebsite: { type: String },
      phoneNumber: { type: String },
    },
    traction: { type: String },
    marketSize: { type: String },
    totalAddressableMarket: { type: String },
    picture: [
      {
        teamProfiles: { type: String },
        productScreenshotsUrl: { type: String },
      },
    ],
    proof: {
      cac: { type: String },
      financialStatements: { type: String },
    },
    pitchDeckCoverAndTagline: { type: String },
    visionAndMission: { type: String },
  },
  {
    timestamps: true,
  }
);

export const StartUpProfile = model<IStartUpProfile>('StartUpProfile', StartUpProfileSchema);