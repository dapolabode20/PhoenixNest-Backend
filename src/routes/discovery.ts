import { Router } from 'express';
import { getDiscoveryFeed, getStartupMatchScore } from '../controllers/discovery.controller';
import { authenticate } from '../middlewares/authenticate'; // adjust path to yours

const router = Router();

// All discovery routes require authentication

/**
 * GET /api/discovery/feed
 *
 * Returns startups ranked by match score for the authenticated investor.
 *
 * Query params:
 *   minScore  number  (default 0)   — exclude startups scoring below this
 *   limit     number  (default 20)  — results per page
 *   page      number  (default 1)   — page number
 *
 * Example response:
 * {
 *   "status": "success",
 *   "message": "Discovery feed retrieved successfully.",
 *   "data": {
 *     "feed": [
 *       {
 *         "startupId": "...",
 *         "companyName": "Aether Cloud Systems",
 *         "industry": "SaaS",
 *         "location": "Lagos",
 *         "traction": "140% YoY Growth, $4.2M ARR",
 *         "matchScore": 98,
 *         "tier": "PREMIUM",
 *         "breakdown": {
 *           "sectorAlignment": 100,
 *           "capitalReadiness": 88,
 *           "scalabilityRisk": 80,
 *           "tractionSignal": 90,
 *           "overallScore": 98
 *         }
 *       }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "totalCount": 45, "totalPages": 3 }
 *   }
 * }
 */
router.get('/feed', authenticate, getDiscoveryFeed);

/**
 * GET /api/discovery/startups/:startupId/match
 *
 * Returns the detailed match score breakdown between the authenticated
 * investor and a specific startup. Used on the "View Pitch" page.
 */
router.get('/startups/match/:id', authenticate, getStartupMatchScore);

export default router;
