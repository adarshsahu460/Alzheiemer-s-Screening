/**
 * FAQ (Functional Activities Questionnaire) Scoring Logic
 * 10 items rated 0-3
 */

export const FAQ_ITEMS = [
  { id: 1, text: 'Writing checks, paying bills, balancing checkbook' },
  { id: 2, text: 'Assembling tax records, business affairs, or papers' },
  { id: 3, text: 'Shopping alone for clothes, household necessities, or groceries' },
  { id: 4, text: 'Playing a game of skill such as bridge or chess, working on a hobby' },
  { id: 5, text: 'Heating water, making a cup of coffee, turning off the stove' },
  { id: 6, text: 'Preparing a balanced meal' },
  { id: 7, text: 'Keeping track of current events' },
  { id: 8, text: 'Paying attention to and understanding a TV program, book, or magazine' },
  { id: 9, text: 'Remembering appointments, family occasions, holidays, medications' },
  { id: 10, text: 'Traveling out of the neighborhood, driving, or arranging to take public transportation' },
] as const;

/**
 * Rating scale:
 * 0 = Normal (can do with no difficulty)
 * 1 = Has difficulty but can do by self
 * 2 = Requires assistance
 * 3 = Dependent (cannot do at all)
 */
export type FAQRating = 0 | 1 | 2 | 3;

export interface FAQItemScore {
  itemId: number;
  rating: FAQRating;
}

export interface FAQAnswers {
  items: FAQItemScore[];
}

export interface FAQResult {
  totalScore: number; // 0-30 (higher = worse impairment)
  itemScores: FAQItemScore[];
  interpretation: string;
  severity: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
  details: {
    answeredItems: number;
    totalItems: number;
    isComplete: boolean;
  };
}

/**
 * Calculate FAQ total score
 * @param items - Array of FAQ item scores
 * @returns FAQ result with total score and interpretation
 */
export function calculateFAQScore(items: FAQItemScore[]): FAQResult {
  if (items.length === 0) {
    return {
      totalScore: 0,
      itemScores: [],
      interpretation: 'No items assessed',
      severity: 'Normal',
      details: {
        answeredItems: 0,
        totalItems: 10,
        isComplete: false,
      },
    };
  }

  // Calculate total score
  const totalScore = items.reduce((sum, item) => sum + item.rating, 0);

  // Determine severity and interpretation
  let severity: FAQResult['severity'];
  let interpretation: string;

  if (totalScore >= 0 && totalScore <= 5) {
    severity = 'Normal';
    interpretation = 'Normal functional ability - No significant impairment';
  } else if (totalScore >= 6 && totalScore <= 12) {
    severity = 'Mild';
    interpretation = 'Mild functional impairment - Some difficulty with complex activities';
  } else if (totalScore >= 13 && totalScore <= 20) {
    severity = 'Moderate';
    interpretation = 'Moderate functional impairment - Requires assistance with multiple activities';
  } else {
    severity = 'Severe';
    interpretation = 'Severe functional impairment - Dependent on others for most activities';
  }

  return {
    totalScore,
    itemScores: items,
    interpretation,
    severity,
    details: {
      answeredItems: items.length,
      totalItems: 10,
      isComplete: items.length === 10,
    },
  };
}

/**
 * Validate FAQ item scores
 */
export function validateFAQScores(items: FAQItemScore[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('No item scores provided');
  }

  if (items.length > 10) {
    errors.push('Too many items provided (max 10)');
  }

  items.forEach((item) => {
    // Validate item ID
    if (item.itemId < 1 || item.itemId > 10) {
      errors.push(`Invalid item ID: ${item.itemId}`);
    }

    // Validate rating (0-3)
    if (item.rating < 0 || item.rating > 3) {
      errors.push(`Invalid rating for item ${item.itemId}: ${item.rating}`);
    }
  });

  // Check for duplicate item IDs
  const itemIds = items.map((i) => i.itemId);
  const uniqueIds = new Set(itemIds);
  if (itemIds.length !== uniqueIds.size) {
    errors.push('Duplicate item scores detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
