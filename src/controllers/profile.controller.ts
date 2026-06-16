import { Request, Response } from 'express';
import Joi from 'joi';
import { ValidationHelper } from '../helpers/validation.helper';
import { startUpProfileRepository } from '../repositories/startUpProfile.repository';
import { investorProfileRepository } from '../repositories/investorProfile.repository';
import { usersRepository } from '../repositories/users.repository';
import { fileUploadService } from '../services/fileUpload.service';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';

type UpdateStartupProfileBody = {
  location?: string;
  shortBio?: string;
  industry?: string;
  biography?: string;
  areaOfExperience?: string;
  traction?: string;
  marketSize?: string;
  totalAddressableMarket?: string;
  pitchDeckCoverAndTagline?: string;
  visionAndMission?: string;
  personalWebsite?: string;
  phoneNumber?: string;
  cacUrl?: string;
  financialStatementsUrl?: string;
};

type UpdateInvestorProfileBody = {
  lookingOutFor?: string;
  stagePreference?: string;
  investorType?: string;
  yearsOfInvestmentExperience?: string;
  communicationPreference?: string;
};

const updateStartupProfileSchema = Joi.object<UpdateStartupProfileBody>({
  location: Joi.string().optional(),
  shortBio: Joi.string().optional(),
  industry: Joi.string().optional(),
  biography: Joi.string().optional(),
  areaOfExperience: Joi.string().optional(),
  traction: Joi.string().optional(),
  marketSize: Joi.string().optional(),
  totalAddressableMarket: Joi.string().optional(),
  pitchDeckCoverAndTagline: Joi.string().optional(),
  visionAndMission: Joi.string().optional(),
  personalWebsite: Joi.string().uri().optional(),
  phoneNumber: Joi.string().optional(),
  cacUrl: Joi.string().uri().optional(),
  financialStatementsUrl: Joi.string().uri().optional()
});

const updateInvestorProfileSchema = Joi.object<UpdateInvestorProfileBody>({
  lookingOutFor: Joi.string().optional(),
  stagePreference: Joi.string().optional(),
  investorType: Joi.string().optional(),
  yearsOfInvestmentExperience: Joi.string().optional(),
  communicationPreference: Joi.string().optional()
});

// ---------------------------------------------------------------------------
// PATCH /api/profile/startup
// Authenticated business_owner — updates their startup profile.
// All fields are optional; only what's sent gets updated.
//
// Accepts multipart/form-data when uploading proof documents.
// For text-only updates, application/json is fine.
// ---------------------------------------------------------------------------
export const updateStartupProfile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(401).json(createErrorResponse('Unauthorised.'));
    return;
  }

  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(500).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  if (userResult.value.profile !== 'business_owner') {
    res.status(403).json(createErrorResponse('Only startup accounts can update a startup profile.'));
    return;
  }

  const validation = ValidationHelper.validateObject(
    req.body,
    Joi.object({
      // Basic info
      location: Joi.string().optional(),
      shortBio: Joi.string().optional(),
      industry: Joi.string().optional(),
      biography: Joi.string().optional(),
      areaOfExperience: Joi.string().optional(),

      // Match score critical fields
      traction: Joi.string().optional(),
      marketSize: Joi.string().optional(),
      totalAddressableMarket: Joi.string().optional(),
      pitchDeckCoverAndTagline: Joi.string().optional(),
      visionAndMission: Joi.string().optional(),

      // Contact
      personalWebsite: Joi.string().uri().optional(),
      phoneNumber: Joi.string().optional()
    })
  );

  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const {
    location,
    shortBio,
    industry,
    biography,
    areaOfExperience,
    traction,
    marketSize,
    totalAddressableMarket,
    pitchDeckCoverAndTagline,
    visionAndMission,
    personalWebsite,
    phoneNumber
  } = validation.value;

  // Handle file uploads if any were attached
  // Expects field names: cacFile, financialFile
  let uploadedCacUrl: string | undefined;
  let uploadedFinancialUrl: string | undefined;

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (files?.cacFile?.[0]) {
    const upload = await fileUploadService.upload(files.cacFile[0].buffer, files.cacFile[0].mimetype, 'phoenix_nest_proofs');
    if (upload.err) {
      res.status(500).json(createErrorResponse('Failed to upload CAC document.'));
      return;
    }
    uploadedCacUrl = upload.value;
  }

  if (files?.financialFile?.[0]) {
    const upload = await fileUploadService.upload(files.financialFile[0].buffer, files.financialFile[0].mimetype, 'phoenix_nest_proofs');
    if (upload.err) {
      res.status(500).json(createErrorResponse('Failed to upload financial statements.'));
      return;
    }
    uploadedFinancialUrl = upload.value;
  }

  // Build update payload — only include fields that were actually sent
  const updateData: Record<string, any> = {};

  if (location !== undefined) updateData.location = location;
  if (shortBio !== undefined) updateData.shortBio = shortBio;
  if (industry !== undefined) updateData.industry = industry;
  if (biography !== undefined) updateData.biography = biography;
  if (areaOfExperience !== undefined) updateData.areaOfExperience = areaOfExperience;
  if (traction !== undefined) updateData.traction = traction;
  if (marketSize !== undefined) updateData.marketSize = marketSize;
  if (totalAddressableMarket !== undefined) updateData.totalAddressableMarket = totalAddressableMarket;
  if (pitchDeckCoverAndTagline !== undefined) updateData.pitchDeckCoverAndTagline = pitchDeckCoverAndTagline;
  if (visionAndMission !== undefined) updateData.visionAndMission = visionAndMission;

  if (personalWebsite !== undefined || phoneNumber !== undefined) {
    updateData.contactInformation = {};
    if (personalWebsite !== undefined) updateData.contactInformation.personalWebsite = personalWebsite;
    if (phoneNumber !== undefined) updateData.contactInformation.phoneNumber = phoneNumber;
  }

  // Proof: only set if files were uploaded
  if (uploadedCacUrl || uploadedFinancialUrl) {
    updateData.proof = {};
    if (uploadedCacUrl) updateData.proof.cac = uploadedCacUrl;
    if (uploadedFinancialUrl) updateData.proof.financialStatements = uploadedFinancialUrl;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json(createErrorResponse('No fields provided to update.'));
    return;
  }

  const updateResult = await startUpProfileRepository.updateByUserId(userId, updateData);
  if (updateResult.err) {
    res.status(500).json(createErrorResponse('Failed to update startup profile.'));
    return;
  }

  if (!updateResult.value) {
    res.status(404).json(createErrorResponse('Startup profile not found.'));
    return;
  }

  res.status(200).json(createSuccessResponse(updateResult.value, 'Startup profile updated successfully.'));
};;

// ---------------------------------------------------------------------------
// PATCH /api/profile/investor
// Authenticated investor — updates their investor profile preferences.
// These are the fields that directly power the match score.
// ---------------------------------------------------------------------------
export const updateInvestorProfile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(401).json(createErrorResponse('Unauthorised.'));
    return;
  }

  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(500).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  if (userResult.value.profile !== 'investor') {
    res.status(403).json(createErrorResponse('Only investor accounts can update an investor profile.'));
    return;
  }

  const validation = ValidationHelper.validateObject(
    req.body,
    Joi.object({
      lookingOutFor: Joi.string().optional(), // e.g. "Fintech"
      stagePreference: Joi.string().optional(), // e.g. "Seed"
      investorType: Joi.string().optional(), // e.g. "Angel"
      yearsOfInvestmentExperience: Joi.string().optional(),
      communicationPreference: Joi.string().optional()
    })
  );

  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { lookingOutFor, stagePreference, investorType, yearsOfInvestmentExperience, communicationPreference } = validation.value;

  const updateData: Record<string, any> = {};

  if (lookingOutFor !== undefined) updateData.lookingOutFor = lookingOutFor;
  if (stagePreference !== undefined) updateData.stagePreference = stagePreference;
  if (investorType !== undefined) updateData.investorType = investorType;
  if (yearsOfInvestmentExperience !== undefined) updateData.yearsOfInvestmentExperience = yearsOfInvestmentExperience;
  if (communicationPreference !== undefined) updateData.communicationPreference = communicationPreference;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json(createErrorResponse('No fields provided to update.'));
    return;
  }

  const updateResult = await investorProfileRepository.updateByUserId(userId, updateData);
  if (updateResult.err) {
    res.status(500).json(createErrorResponse('Failed to update investor profile.'));
    return;
  }

  if (!updateResult.value) {
    res.status(404).json(createErrorResponse('Investor profile not found.'));
    return;
  }

  res.status(200).json(createSuccessResponse(updateResult.value, 'Investor profile updated successfully.'));
};

// ---------------------------------------------------------------------------
// GET /api/profile/me
// Returns the authenticated user's profile (startup or investor)
// ---------------------------------------------------------------------------
export const getMyProfile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(401).json(createErrorResponse('Unauthorised.'));
    return;
  }

  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(500).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  const user = userResult.value;

  if (user.profile === 'business_owner') {
    const profileResult = await startUpProfileRepository.findByUserIdWithUser(userId);
    if (profileResult.err) {
      res.status(500).json(createErrorResponse('Failed to retrieve startup profile.'));
      return;
    }
    res.status(200).json(createSuccessResponse(profileResult.value, 'Profile retrieved successfully.'));
  } else {
    const profileResult = await investorProfileRepository.findByUserIdWithUser(userId);
    if (profileResult.err) {
      res.status(500).json(createErrorResponse('Failed to retrieve investor profile.'));
      return;
    }
    res.status(200).json(createSuccessResponse(profileResult.value, 'Profile retrieved successfully.'));
  }
};
