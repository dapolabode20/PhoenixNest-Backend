import { Request, Response } from 'express';
import Joi from 'joi';
import { ValidationHelper } from '../helpers/validation.helper';
import { startUpProfileRepository } from '../repositories/startUpProfile.repository';
import { investorProfileRepository } from '../repositories/investorProfile.repository';
import { usersRepository } from '../repositories/users.repository';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';
import { httpStatus } from '../helpers/httpStatus.utils';

// ---------------------------------------------------------------------------
// PATCH /api/profile/startup
// Authenticated business_owner — updates their startup profile.
// All fields are optional; only what's sent gets updated. JSON body only —
// any file-backed field (logoUrl, proof.*, coreLeadership[].imageUrl) is a
// URL obtained beforehand from POST /api/uploads.
// ---------------------------------------------------------------------------
export const updateStartupProfile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Unauthorised.'));
    return;
  }

  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  if (userResult.value.profile !== 'business_owner') {
    res.status(httpStatus.forbidden).json(createErrorResponse('Only startup accounts can update a startup profile.'));
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
      marketSize: Joi.number().optional(),
      totalAddressableMarket: Joi.number().optional(),
      currency: Joi.string().length(3).uppercase().optional(),
      pitchDeckCoverAndTagline: Joi.string().optional(),
      pitchVideoUrl: Joi.string().optional(),
      visionAndMission: Joi.string().optional(),
      logoUrl: Joi.string().uri().optional(),

      // Contact
      personalWebsite: Joi.string().uri().optional(),
      phoneNumber: Joi.string().optional(),
      coreLeadership: Joi.array()
        .items(
          Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            position: Joi.string().required(),
            imageUrl: Joi.string().uri().optional()
          })
        )
        .optional(),

      // Documents — URLs obtained from POST /api/uploads
      proof: Joi.object({
        cac: Joi.string().uri().optional(),
        pitchDeck: Joi.string().uri().optional(),
        businessPlan: Joi.string().uri().optional(),
        financialModel: Joi.string().uri().optional()
      }).optional()
    })
  );

  if (validation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(validation.err.message, validation.err));
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
    currency,
    pitchDeckCoverAndTagline,
    pitchVideoUrl,
    visionAndMission,
    logoUrl,
    personalWebsite,
    phoneNumber,
    coreLeadership,
    proof
  } = validation.value;

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
  if (currency !== undefined) updateData.currency = currency;
  if (pitchDeckCoverAndTagline !== undefined) updateData.pitchDeckCoverAndTagline = pitchDeckCoverAndTagline;
  if (pitchVideoUrl !== undefined) updateData.pitchVideoUrl = pitchVideoUrl;
  if (visionAndMission !== undefined) updateData.visionAndMission = visionAndMission;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (coreLeadership !== undefined) updateData.coreLeadership = coreLeadership;

  if (personalWebsite !== undefined || phoneNumber !== undefined) {
    updateData.contactInformation = {};
    if (personalWebsite !== undefined) updateData.contactInformation.personalWebsite = personalWebsite;
    if (phoneNumber !== undefined) updateData.contactInformation.phoneNumber = phoneNumber;
  }

  if (proof !== undefined) {
    // findOneAndUpdate does a flat $set on `proof`, which would wipe out
    // previously-set document links if we didn't merge with what's there.
    const currentProfileResult = await startUpProfileRepository.findByUserId(userId);
    if (currentProfileResult.err) {
      res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve existing startup profile.'));
      return;
    }
    updateData.proof = { ...currentProfileResult.value?.proof, ...proof };
  }

  if (Object.keys(updateData).length === 0) {
    res.status(httpStatus.badRequest).json(createErrorResponse('No fields provided to update.'));
    return;
  }

  const updateResult = await startUpProfileRepository.updateByUserId(userId, updateData);
  if (updateResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(updateResult.err.message || 'Failed to update startup profile.'));
    return;
  }

  if (!updateResult.value) {
    res.status(httpStatus.notFound).json(createErrorResponse('Startup profile not found.'));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse(updateResult.value, 'Startup profile updated successfully.'));
};

// ---------------------------------------------------------------------------
// PATCH /api/profile/investor
// Authenticated investor — updates their investor profile preferences.
// ---------------------------------------------------------------------------
export const updateInvestorProfile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Unauthorised.'));
    return;
  }

  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  if (userResult.value.profile !== 'investor') {
    res.status(httpStatus.forbidden).json(createErrorResponse('Only investor accounts can update an investor profile.'));
    return;
  }

  const validation = ValidationHelper.validateObject(
    req.body,
    Joi.object({
      lookingOutFor: Joi.string().optional(), // e.g. "Fintech"
      stagePreference: Joi.string().optional(), // e.g. "Seed"
      investorType: Joi.string().optional(), // e.g. "Angel"
      yearsOfInvestmentExperience: Joi.string().optional(),
      communicationPreference: Joi.string().optional(),
      avatarUrl: Joi.string().uri().optional()
    })
  );

  if (validation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { lookingOutFor, stagePreference, investorType, yearsOfInvestmentExperience, communicationPreference, avatarUrl } = validation.value;

  const updateData: Record<string, any> = {};

  if (lookingOutFor !== undefined) updateData.lookingOutFor = lookingOutFor;
  if (stagePreference !== undefined) updateData.stagePreference = stagePreference;
  if (investorType !== undefined) updateData.investorType = investorType;
  if (yearsOfInvestmentExperience !== undefined) updateData.yearsOfInvestmentExperience = yearsOfInvestmentExperience;
  if (communicationPreference !== undefined) updateData.communicationPreference = communicationPreference;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  if (Object.keys(updateData).length === 0) {
    res.status(httpStatus.badRequest).json(createErrorResponse('No fields provided to update.'));
    return;
  }

  const updateResult = await investorProfileRepository.updateByUserId(userId, updateData);
  if (updateResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to update investor profile.'));
    return;
  }

  if (!updateResult.value) {
    res.status(httpStatus.notFound).json(createErrorResponse('Investor profile not found.'));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse(updateResult.value, 'Investor profile updated successfully.'));
};

// ---------------------------------------------------------------------------
// GET /api/profile/me
// Returns the authenticated user's profile (startup or investor)
// ---------------------------------------------------------------------------
export const getMyProfile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Unauthorised.'));
    return;
  }

  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  const user = userResult.value;

  if (user.profile === 'business_owner') {
    const profileResult = await startUpProfileRepository.findByUserIdWithUser(userId);
    if (profileResult.err) {
      res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve startup profile.'));
      return;
    }
    res.status(httpStatus.ok).json(createSuccessResponse(profileResult.value, 'Profile retrieved successfully.'));
  } else {
    const profileResult = await investorProfileRepository.findByUserIdWithUser(userId);
    if (profileResult.err) {
      res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve investor profile.'));
      return;
    }
    res.status(httpStatus.ok).json(createSuccessResponse(profileResult.value, 'Profile retrieved successfully.'));
  }
};
