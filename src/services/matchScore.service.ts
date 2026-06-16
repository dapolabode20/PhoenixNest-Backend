import { IInvestorProfile } from '../models/investorProfile.model';
import { IStartUpProfile } from '../models/startUpProfile.model';

export interface MatchBreakdown {
  sectorAlignment: number; // 0–100
  scalabilityRisk: number; // 0–100 (higher = lower risk = better)
  tractionSignal: number; // 0–100
  overallScore: number; // weighted composite
}

export interface MatchResult {
  startupId: string;
  investorId: string;
  score: number;
  breakdown: MatchBreakdown;
  tier: 'PREMIUM' | 'STANDARD' | 'LOW';
}

// ---------------------------------------------------------------------------
// Weights — must sum to 1.0
// Bode's call: sector, scalability, traction only
// ---------------------------------------------------------------------------
const WEIGHTS = {
  sectorAlignment: 0.4,
  scalabilityRisk: 0.3,
  tractionSignal: 0.3
};

// ---------------------------------------------------------------------------
// Sector / industry keyword synonym groups
// So "fintech" investor matches a startup whose industry says "payments"
// ---------------------------------------------------------------------------
const SECTOR_SYNONYMS: Record<string, string[]> = {
  fintech: ['fintech', 'finance', 'payments', 'banking', 'insurtech', 'lending'],
  healthtech: ['health', 'healthtech', 'medtech', 'biotech', 'pharma', 'wellness'],
  saas: ['saas', 'software', 'b2b', 'enterprise', 'cloud'],
  web3: ['web3', 'blockchain', 'crypto', 'defi', 'nft', 'dao'],
  ecommerce: ['ecommerce', 'retail', 'marketplace', 'logistics', 'supply chain'],
  edtech: ['edtech', 'education', 'learning', 'e-learning'],
  agritech: ['agritech', 'agriculture', 'farming', 'food'],
  cleantech: ['cleantech', 'climate', 'energy', 'sustainability', 'greentech']
};

// ---------------------------------------------------------------------------
// Helper: strip everything except lowercase letters and numbers
// ---------------------------------------------------------------------------
function normalise(value?: string): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// 1. Sector Alignment  (0–100)
//    Does the investor's focus area match the startup's industry?
// ---------------------------------------------------------------------------
function scoreSectorAlignment(investor: IInvestorProfile, startup: IStartUpProfile): number {
  const investorFocus = normalise(investor.lookingOutFor);
  const startupIndustry = normalise(startup.industry);

  // If either side hasn't filled this in yet, return neutral
  if (!investorFocus || !startupIndustry) return 40;

  // Exact / substring match
  if (startupIndustry.includes(investorFocus) || investorFocus.includes(startupIndustry)) {
    return 100;
  }

  // Synonym group match — both investor and startup map to the same bucket
  for (const synonyms of Object.values(SECTOR_SYNONYMS)) {
    const investorInGroup = synonyms.some((s) => investorFocus.includes(normalise(s)));
    const startupInGroup = synonyms.some((s) => startupIndustry.includes(normalise(s)));
    if (investorInGroup && startupInGroup) return 90;
  }

  // Partial word overlap
  const focusWords = investorFocus.split(/\s+/);
  const matchedWords = focusWords.filter((w) => startupIndustry.includes(w));
  if (matchedWords.length > 0) {
    return Math.round((matchedWords.length / focusWords.length) * 70);
  }

  return 20; // no overlap at all
}

// ---------------------------------------------------------------------------
// 2. Scalability Risk  (0–100, higher = lower risk = better)
//    How well has the startup documented their growth potential?
//    Each field they fill in is a positive signal.
// ---------------------------------------------------------------------------
function scoreScalabilityRisk(startup: IStartUpProfile): number {
  let score = 0;

  if (startup.marketSize) score += 20; // knows their market
  if (startup.totalAddressableMarket) score += 20; // knows their TAM
  if (startup.traction) score += 20; // has traction data
  if (startup.pitchDeckCoverAndTagline) score += 15; // has a pitch deck
  if (startup.visionAndMission) score += 10; // has a clear vision
  if (startup.proof?.cac) score += 10; // registered company
  if (startup.proof?.financialStatements) score += 5; // has financials

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// 3. Traction Signal  (0–100)
//    Is there real evidence this startup is growing?
// ---------------------------------------------------------------------------
function scoreTractionSignal(startup: IStartUpProfile): number {
  let score = 0;

  const tractionText = normalise(startup.traction ?? '');

  // Power words investors look for in traction descriptions
  const keywords = ['revenue', 'arr', 'mrr', 'growth', 'yoy', 'mom', 'users', 'customers', 'contracts', 'partnerships'];
  const matched = keywords.filter((k) => tractionText.includes(k));
  score += matched.length * 10; // each keyword = 10 points, up to 100

  // Profile completeness as a secondary maturity signal
  if (startup.biography) score += 5;
  if (startup.areaOfExperience) score += 5;
  if (startup.contactInformation?.personalWebsite) score += 5;
  if ((startup.picture ?? []).length > 0) score += 5;

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// Main: compute full match result between one investor and one startup
// ---------------------------------------------------------------------------
export function computeMatchScore(investor: IInvestorProfile, startup: IStartUpProfile): MatchResult {
  const sectorAlignment = scoreSectorAlignment(investor, startup);
  const scalabilityRisk = scoreScalabilityRisk(startup);
  const tractionSignal = scoreTractionSignal(startup);

  const overallScore = Math.round(
    sectorAlignment * WEIGHTS.sectorAlignment + scalabilityRisk * WEIGHTS.scalabilityRisk + tractionSignal * WEIGHTS.tractionSignal
  );

  const tier: MatchResult['tier'] = overallScore >= 85 ? 'PREMIUM' : overallScore >= 60 ? 'STANDARD' : 'LOW';

  return {
    startupId: (startup._id as any).toString(),
    investorId: (investor._id as any).toString(),
    score: overallScore,
    breakdown: { sectorAlignment, scalabilityRisk, tractionSignal, overallScore },
    tier
  };
}

// ---------------------------------------------------------------------------
// Batch: score every startup for a given investor, sorted highest first
// ---------------------------------------------------------------------------
export function rankStartupsForInvestor(investor: IInvestorProfile, startups: IStartUpProfile[], minScore = 0): MatchResult[] {
  return startups
    .map((startup) => computeMatchScore(investor, startup))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
