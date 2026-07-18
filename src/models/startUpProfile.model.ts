import { Schema, model, Document } from 'mongoose';

interface ContactInformation {
  personalWebsite?: string;
  phoneNumber?: string;
}

interface Picture {
  teamProfiles?: string;
  productScreenshotsUrl?: string;
}

// Each member of the founding/leadership team
interface CoreLeadershipMember {
  firstName: string;
  lastName: string;
  position: string; // e.g. "Chief Executive", "CTO / Founder", "Strategy Lead"
  imageUrl?: string;
}

// Documents the startup uploads to prove legitimacy and readiness
interface Proof {
  cac?: string; // CAC registration document URL
  pitchDeck?: string; // Pitch deck PDF URL
  businessPlan?: string; // Business plan document URL
  financialModel?: string; // Financial model / projections URL
}

export interface IStartUpProfile extends Document {
  userId: Schema.Types.ObjectId;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  professionalEmail: string;
  companyName: string;
  registrationNumber: string;
  identificationNumber: string;
  identificationDocumentUrl: string;
  identificationType?: string;
  location?: string;
  shortBio?: string;
  industry?: string;
  biography?: string;
  areaOfExperience?: string;
  contactInformation?: ContactInformation;
  traction?: string; // Kept as string — e.g. "140% YoY Growth, FDA Phase I Clear"
  // Stored as plain numbers so they can be sorted/filtered later.
  // The currency field (ISO 4217) applies to both.
  // e.g. marketSize: 500000000000, currency: "NGN"
  marketSize?: number;
  totalAddressableMarket?: number;
  currency?: string; // e.g. "NGN", "USD"

  picture: Picture[];
  coreLeadership?: CoreLeadershipMember[];
  proof?: Proof;
  pitchDeckCoverAndTagline?: string;
  pitchVideoUrl?: string;
  visionAndMission?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StartUpProfileSchema = new Schema<IStartUpProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    professionalEmail: { type: String, required: true },
    companyName: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    identificationNumber: { type: String, required: true },
    identificationDocumentUrl: { type: String, required: true },
    identificationType: { type: String },
    location: { type: String },
    shortBio: { type: String },
    industry: { type: String },
    biography: { type: String },
    areaOfExperience: { type: String },
    contactInformation: {
      personalWebsite: { type: String },
      phoneNumber: { type: String }
    },
    traction: { type: String },
    marketSize: { type: Number },
    totalAddressableMarket: { type: Number },
    currency: { type: String, uppercase: true, trim: true }, // ISO 4217 e.g. "NGN"
    picture: [
      {
        teamProfiles: { type: String },
        productScreenshotsUrl: { type: String }
      }
    ],
    coreLeadership: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        position: { type: String, required: true },
        imageUrl: { type: String }
      }
    ],
    proof: {
      cac: { type: String },
      pitchDeck: { type: String },
      businessPlan: { type: String },
      financialModel: { type: String }
    },
    pitchDeckCoverAndTagline: { type: String },
    pitchVideoUrl: { type: String },
    visionAndMission: { type: String },
    logoUrl: { type: String }
  },
  {
    timestamps: true
  }
);

export const StartUpProfile = model<IStartUpProfile>('StartUpProfile', StartUpProfileSchema);
