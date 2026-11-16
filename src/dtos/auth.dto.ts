export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBusinessOwnerBody {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
  professionalEmail: string;
  companyName: string;
  registrationNumber: string;
  identificationNumber: string;
  identificationDocumentUrl: string;
  identificationType?: string;
  location?: string;
  shortBio?: string;
  industry?: string;
}

export interface RegisterInvestorBody {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
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

// Used by both resend-otp and forgot-password.
export interface EmailBody {
  email: string;
}

export interface VerifyOtpBody {
  email: string;
  otp: string;
}

export interface ResetPasswordBody {
  email: string;
  otp: string;
  newPassword: string;
}
