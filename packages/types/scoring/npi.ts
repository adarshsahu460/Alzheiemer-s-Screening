/**
 * NPI (Neuropsychiatric Inventory) Scoring Logic
 */

export const NPI_DOMAINS = [
  { id: 1, name: 'Delusions', code: 'DELUSIONS' },
  { id: 2, name: 'Hallucinations', code: 'HALLUCINATIONS' },
  { id: 3, name: 'Agitation/Aggression', code: 'AGITATION' },
  { id: 4, name: 'Depression/Dysphoria', code: 'DEPRESSION' },
  { id: 5, name: 'Anxiety', code: 'ANXIETY' },
  { id: 6, name: 'Elation/Euphoria', code: 'ELATION' },
  { id: 7, name: 'Apathy/Indifference', code: 'APATHY' },
  { id: 8, name: 'Disinhibition', code: 'DISINHIBITION' },
  { id: 9, name: 'Irritability/Lability', code: 'IRRITABILITY' },
  { id: 10, name: 'Aberrant Motor Behavior', code: 'ABERRANT_MOTOR' },
  { id: 11, name: 'Sleep and Night-time Behaviors', code: 'SLEEP' },
  { id: 12, name: 'Appetite and Eating', code: 'APPETITE' },
] as const;

export interface NPIDomainScore {
  domainId: number;
  frequency: number; // 1-4 (1=occasionally, 2=often, 3=frequently, 4=very frequently)
  severity: number; // 1-3 (1=mild, 2=moderate, 3=severe)
  distress: number; // 0-5 (0=not at all, 1=minimal, 2=mild, 3=moderate, 4=severe, 5=extreme)
  score: number; // frequency × severity
}

export interface NPIAnswers {
  domains: NPIDomainScore[];
}

export interface NPIResult {
  totalScore: number; // Sum of all domain scores (frequency × severity)
  totalDistress: number; // Sum of all distress scores
  domainScores: NPIDomainScore[];
  interpretation: string;
  details: {
    assessedDomains: number;
    totalDomains: number;
    isComplete: boolean;
  };
}

/**
 * Calculate NPI score from domain answers
 * @param domains - Array of domain scores
 * @returns NPI result with total score and domain breakdown
 */
export function calculateNPIScore(domains: NPIDomainScore[]): NPIResult {
  if (domains.length === 0) {
    return {
      totalScore: 0,
      totalDistress: 0,
      domainScores: [],
      interpretation: 'No domains assessed',
      details: {
        assessedDomains: 0,
        totalDomains: 12,
        isComplete: false,
      },
    };
  }

  // Calculate scores for each domain
  const scoredDomains = domains.map((domain) => ({
    ...domain,
    score: domain.frequency * domain.severity,
  }));

  const totalScore = scoredDomains.reduce((sum, d) => sum + d.score, 0);
  const totalDistress = scoredDomains.reduce((sum, d) => sum + d.distress, 0);

  // Generate interpretation
  let interpretation = '';
  if (totalScore === 0) {
    interpretation = 'No significant neuropsychiatric symptoms detected';
  } else if (totalScore <= 20) {
    interpretation = 'Mild neuropsychiatric symptoms present';
  } else if (totalScore <= 40) {
    interpretation = 'Moderate neuropsychiatric symptoms - Clinical attention recommended';
  } else {
    interpretation = 'Severe neuropsychiatric symptoms - Immediate clinical intervention recommended';
  }

  return {
    totalScore,
    totalDistress,
    domainScores: scoredDomains,
    interpretation,
    details: {
      assessedDomains: domains.length,
      totalDomains: 12,
      isComplete: domains.length === 12,
    },
  };
}

/**
 * Validate NPI domain scores
 */
export function validateNPIScores(domains: NPIDomainScore[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Empty array is valid - means no symptoms present

  domains.forEach((domain) => {
    // Validate domain ID
    if (domain.domainId < 1 || domain.domainId > 12) {
      errors.push(`Invalid domain ID: ${domain.domainId}`);
    }

    // Validate frequency (1-4)
    if (domain.frequency < 1 || domain.frequency > 4) {
      errors.push(`Invalid frequency for domain ${domain.domainId}: ${domain.frequency}`);
    }

    // Validate severity (1-3)
    if (domain.severity < 1 || domain.severity > 3) {
      errors.push(`Invalid severity for domain ${domain.domainId}: ${domain.severity}`);
    }

    // Validate distress (0-5)
    if (domain.distress < 0 || domain.distress > 5) {
      errors.push(`Invalid distress for domain ${domain.domainId}: ${domain.distress}`);
    }
  });

  // Check for duplicate domains
  const domainIds = domains.map((d) => d.domainId);
  const uniqueIds = new Set(domainIds);
  if (domainIds.length !== uniqueIds.size) {
    errors.push('Duplicate domain scores detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
