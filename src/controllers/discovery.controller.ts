import { Request, Response } from 'express';
import Joi from 'joi';
import { investorProfileRepository } from '../repositories/investorProfile.repository';
import { startUpProfileRepository } from '../repositories/startUpProfile.repository';
import { usersRepository } from '../repositories/users.repository';
import { ValidationHelper } from '../helpers/validation.helper';
import { rankStartupsForInvestor, computeMatchScore } from '../services/matchScore.service';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';

type DiscoveryFeedQuery = {
  minScore: number;
  limit: number;
  page: number;
};

type StartupMatchParams = {
  startupId: string;
};

const discoveryFeedQuerySchema = Joi.object<DiscoveryFeedQuery>({
  minScore: Joi.number().min(0).max(100).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
});

const startupMatchParamsSchema = Joi.object<StartupMatchParams>({
  startupId: Joi.string().required(),
});

// ---------------------------------------------------------------------------
// GET /discovery/feed
// Authenticated investor — returns startups ranked by match score.
//
// Query params:
//   minScore  (optional, default 0)  — filter out startups below this score
//   limit     (optional, default 20) — max results to return
//   page      (optional, default 1)  — pagination
// ---------------------------------------------------------------------------
export const getDiscoveryFeed = async (req: Request, res: Response) => {
  // req.user is populated by your auth middleware
  // const userId = (req as any).user?.userId as string;
  const { userId } = req.auth;

  if (!userId) {
    res.status(401).json(createErrorResponse('Unauthorised.'));
    return;
  }

  // Verify the caller is an investor
  const userResult = await usersRepository.findById(userId);
  if (userResult.err || !userResult.value) {
    res.status(500).json(createErrorResponse('Failed to retrieve user.'));
    return;
  }

  if (userResult.value.profile !== 'investor') {
    res.status(403).json(createErrorResponse('Only investors can access the discovery feed.'));
    return;
  }

  // Fetch the investor's own profile (contains preferences)
  const investorResult = await investorProfileRepository.findByUserId(userId);
  if (investorResult.err) {
    res.status(500).json(createErrorResponse('Failed to retrieve investor profile.'));
    return;
  }

  if (!investorResult.value) {
    res.status(404).json(createErrorResponse('Investor profile not found. Please complete your profile first.'));
    return;
  }

  // Fetch all startup profiles
  const startupsResult = await startUpProfileRepository.findAll();
  if (startupsResult.err) {
    res.status(500).json(createErrorResponse('Failed to retrieve startups.'));
    return;
  }

  const startups = startupsResult.value ?? [];

  const queryValidation = ValidationHelper.validateObject<DiscoveryFeedQuery>(req.query, discoveryFeedQuerySchema);
  if (queryValidation.err || !queryValidation.value) {
    const validationError = queryValidation.err ?? new Error('Invalid query parameters.');
    res.status(400).json(createErrorResponse(validationError.message, validationError));
    return;
  }

  const { minScore, limit, page } = queryValidation.value;

  // Compute and rank
  const ranked = rankStartupsForInvestor(investorResult.value, startups, minScore);

  // Paginate
  const totalCount = ranked.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginated = ranked.slice((page - 1) * limit, page * limit);

  // Shape the response to match what the frontend Discovery Feed card needs
  const feed = paginated.map((result) => {
    const startup = startups.find((s) => (s._id as any).toString() === result.startupId)!;
    return {
      startupId: result.startupId,
      companyName: startup.companyName,
      industry: startup.industry ?? null,
      location: startup.location ?? null,
      shortBio: startup.shortBio ?? null,
      traction: startup.traction ?? null,
      marketSize: startup.marketSize ?? null,
      totalAddressableMarket: startup.totalAddressableMarket ?? null,
      currency: startup.currency ?? null,
      pitchDeckCoverAndTagline: startup.pitchDeckCoverAndTagline ?? null,
      matchScore: result.score,
      tier: result.tier,
      breakdown: result.breakdown
    };
  });

  res.status(200).json(createSuccessResponse(
    {
      feed,
      pagination: { page, limit, totalCount, totalPages },
    },
    'Discovery feed retrieved successfully.',
  ));
};

// ---------------------------------------------------------------------------
// GET /discovery/startups/:startupId/match
// Authenticated investor — returns the detailed match score for a specific
// startup (used on the "View Pitch" / investor-view-pitch page).
// ---------------------------------------------------------------------------
export const getStartupMatchScore = async (req: Request, res: Response) => {
  const validation = ValidationHelper.validateObject(req.params,
    Joi.object({ id: Joi.string().required() })
  );
  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { id: startupId } = validation.value;
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
    res.status(403).json(createErrorResponse('Only investors can view match scores.'));
    return;
  }

  const investorResult = await investorProfileRepository.findByUserId(userId);
  if (investorResult.err || !investorResult.value) {
    res.status(404).json(createErrorResponse('Investor profile not found.'));
    return;
  }

  const startupResult = await startUpProfileRepository.findById(startupId);
  if (startupResult.err) {
    res.status(500).json(createErrorResponse('Failed to retrieve startup profile.'));
    return;
  }

  if (!startupResult.value) {
    res.status(404).json(createErrorResponse('Startup not found.'));
    return;
  }

  const matchResult = computeMatchScore(investorResult.value, startupResult.value);

  res.status(200).json(
    createSuccessResponse(
      {
        startupId,
        companyName: startupResult.value.companyName,
        marketSize: startupResult.value.marketSize ?? null,
        totalAddressableMarket: startupResult.value.totalAddressableMarket ?? null,
        currency: startupResult.value.currency ?? null,
        matchScore: matchResult.score,
        tier: matchResult.tier,
        breakdown: {
          sectorAlignment: matchResult.breakdown.sectorAlignment,
          scalabilityRisk: matchResult.breakdown.scalabilityRisk,
          tractionSignal: matchResult.breakdown.tractionSignal
        }
      },
      'Match score computed successfully.'
    )
  );
};
