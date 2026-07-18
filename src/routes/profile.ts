import { Router } from 'express';
import { updateStartupProfile, updateInvestorProfile, getMyProfile } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

/**
 * GET /api/profile/me
 * Returns the logged-in user's full profile (startup or investor).
 */
router.get('/user', authenticate, getMyProfile);

/**
 * PATCH /api/profile/startup
 * Updates the startup's profile — all fields optional. JSON body only.
 * File-backed fields (logoUrl, proof.*, coreLeadership[].imageUrl) are URLs
 * obtained beforehand from POST /api/uploads.
 *
 * Fields: location, shortBio, industry, biography, areaOfExperience,
 *         traction, marketSize, totalAddressableMarket, currency,
 *         pitchDeckCoverAndTagline, pitchVideoUrl, visionAndMission,
 *         personalWebsite, phoneNumber, logoUrl,
 *         proof: { cac, pitchDeck, businessPlan, financialModel },
 *         coreLeadership: [{ firstName, lastName, position, imageUrl }]
 */
router.patch('/startup', authenticate, updateStartupProfile);

/**
 * PATCH /api/profile/investor
 * Updates the investor's preferences — all fields optional.
 *
 * Fields: lookingOutFor, stagePreference, investorType,
 *         yearsOfInvestmentExperience, communicationPreference, avatarUrl
 */
router.patch('/investor', authenticate, updateInvestorProfile);

export default router;
