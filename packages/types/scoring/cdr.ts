/**
 * CDR (Clinical Dementia Rating) Scoring Logic
 * Uses box scores to calculate global CDR score
 */

/**
 * CDR Box Score Domains
 */
export const CDR_DOMAINS = [
  { id: 'memory', name: 'Memory' },
  { id: 'orientation', name: 'Orientation' },
  { id: 'judgmentProblem', name: 'Judgment & Problem Solving' },
  { id: 'communityAffairs', name: 'Community Affairs' },
  { id: 'homeHobbies', name: 'Home & Hobbies' },
  { id: 'personalCare', name: 'Personal Care' },
] as const;

/**
 * Valid CDR box scores
 */
export type CDRBoxScore = 0 | 0.5 | 1 | 2 | 3;

export interface CDRBoxScores {
  memory: CDRBoxScore;
  orientation: CDRBoxScore;
  judgmentProblem: CDRBoxScore;
  communityAffairs: CDRBoxScore;
  homeHobbies: CDRBoxScore;
  personalCare: CDRBoxScore;
}

export interface CDRResult {
  boxScores: CDRBoxScores;
  globalScore: CDRBoxScore;
  stage: 'Normal' | 'Questionable' | 'Mild' | 'Moderate' | 'Severe';
  interpretation: string;
  details: {
    scoringMethod: string;
    isComplete: boolean;
  };
}

/**
 * Calculate CDR Global Score using the standard algorithm
 * 
 * Algorithm rules (simplified):
 * 1. Memory is primary domain
 * 2. If at least 3 secondary domains score at memory level, global = memory
 * 3. Otherwise, use majority of secondary domains
 * 
 * @param boxScores - CDR box scores for all 6 domains
 * @returns CDR result with global score and interpretation
 */
export function calculateCDRScore(boxScores: CDRBoxScores): CDRResult {
  const { memory, orientation, judgmentProblem, communityAffairs, homeHobbies, personalCare } =
    boxScores;

  // Secondary domains (all except memory)
  const secondaryDomains = [
    orientation,
    judgmentProblem,
    communityAffairs,
    homeHobbies,
    personalCare,
  ];

  let globalScore: CDRBoxScore;
  let scoringMethod: string;

  // Count how many secondary domains match the memory score
  const domainsMatchingMemory = secondaryDomains.filter((score) => score === memory).length;

  // Standard CDR algorithm
  if (memory === 0 && secondaryDomains.every((score) => score === 0)) {
    // All domains are 0
    globalScore = 0;
    scoringMethod = 'All domains scored 0';
  } else if (domainsMatchingMemory >= 3) {
    // At least 3 secondary domains match memory
    globalScore = memory;
    scoringMethod = 'Memory score with majority agreement from secondary domains';
  } else {
    // Use majority of secondary domains
    const sortedSecondary = [...secondaryDomains].sort((a, b) => b - a);
    const median = sortedSecondary[2]; // Middle value (3rd of 5)
    globalScore = median;
    scoringMethod = 'Majority of secondary domains';
  }

  // Determine stage and interpretation
  let stage: CDRResult['stage'];
  let interpretation: string;

  switch (globalScore) {
    case 0:
      stage = 'Normal';
      interpretation = 'No dementia - Normal cognitive function';
      break;
    case 0.5:
      stage = 'Questionable';
      interpretation = 'Very mild/Questionable dementia - Possible cognitive impairment';
      break;
    case 1:
      stage = 'Mild';
      interpretation = 'Mild dementia - Clear but mild cognitive impairment';
      break;
    case 2:
      stage = 'Moderate';
      interpretation = 'Moderate dementia - Significant cognitive and functional impairment';
      break;
    case 3:
      stage = 'Severe';
      interpretation = 'Severe dementia - Severe cognitive impairment requiring full assistance';
      break;
    default:
      stage = 'Normal';
      interpretation = 'Unable to determine';
  }

  return {
    boxScores,
    globalScore,
    stage,
    interpretation,
    details: {
      scoringMethod,
      isComplete: true,
    },
  };
}

/**
 * Validate CDR box scores
 */
export function validateCDRScores(boxScores: Partial<CDRBoxScores>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const validScores: CDRBoxScore[] = [0, 0.5, 1, 2, 3];

  const domains: (keyof CDRBoxScores)[] = [
    'memory',
    'orientation',
    'judgmentProblem',
    'communityAffairs',
    'homeHobbies',
    'personalCare',
  ];

  domains.forEach((domain) => {
    const score = boxScores[domain];

    if (score === undefined) {
      errors.push(`Missing score for domain: ${domain}`);
    } else if (!validScores.includes(score as CDRBoxScore)) {
      errors.push(`Invalid score for ${domain}: ${score}. Must be 0, 0.5, 1, 2, or 3`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
