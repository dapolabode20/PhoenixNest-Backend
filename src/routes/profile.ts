import { Router } from 'express';
import { updateStartupProfile, updateInvestorProfile, getMyProfile } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/authenticate';
import { upload } from '../middlewares/upload'; // your existing multer instance

const router = Router();

/**
 * GET /api/profile/me
 * Returns the logged-in user's full profile (startup or investor).
 */
router.get('/user', authenticate, getMyProfile);

/**
 * PATCH /api/profile/startup
 * Updates the startup's profile — all fields optional.
 * Accepts multipart/form-data (for file uploads) or application/json.
 *
 * Text fields: location, shortBio, industry, biography, areaOfExperience,
 *              traction, marketSize, totalAddressableMarket,
 *              pitchDeckCoverAndTagline, visionAndMission,
 *              personalWebsite, phoneNumber,
 *              cacUrl, financialStatementsUrl
 *
 * File fields: cacFile, financialFile
 */
router.patch('/startup', authenticate, upload.fields([
  { name: 'cacFile', maxCount: 1 },
  { name: 'pitchDeckFile', maxCount: 1 },
  { name: 'businessPlanFile', maxCount: 1 },
  { name: 'financialModelFile', maxCount: 1 },
]), updateStartupProfile);

/**
 * PATCH /api/profile/investor
 * Updates the investor's preferences — all fields optional.
 *
 * Fields: lookingOutFor, stagePreference, investorType,
 *         yearsOfInvestmentExperience, communicationPreference
 */
router.patch('/investor', authenticate, updateInvestorProfile);

export default router;
