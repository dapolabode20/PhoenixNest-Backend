// A leadership entry with `_id` updates that existing member; without `_id`
// it is added as a new member.
export interface CoreLeadershipMemberBody {
  _id?: string;
  firstName: string;
  lastName: string;
  position: string;
  imageUrl?: string;
}

// Every field is optional: only the fields sent are updated.
export interface UpdateStartupProfileBody {
  location?: string;
  shortBio?: string;
  industry?: string;
  biography?: string;
  areaOfExperience?: string;
  traction?: string;
  marketSize?: number;
  totalAddressableMarket?: number;
  currency?: string;
  pitchDeckCoverAndTagline?: string;
  pitchVideoUrl?: string;
  visionAndMission?: string;
  logoUrl?: string;
  personalWebsite?: string;
  phoneNumber?: string;
  coreLeadership?: CoreLeadershipMemberBody[];
  cacUrl?: string;
  pitchDeckUrl?: string;
  businessPlanUrl?: string;
  financialModelUrl?: string;
}

// Every field is optional: only the fields sent are updated.
export interface UpdateInvestorProfileBody {
  lookingOutFor?: string;
  stagePreference?: string;
  investorType?: string;
  yearsOfInvestmentExperience?: string;
  communicationPreference?: string;
  avatarUrl?: string;
}
