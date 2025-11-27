/**
 * GDS (Geriatric Depression Scale) - 15 Item Version
 * Scoring Logic and Types
 */

/**
 * GDS questions (yes/no format)
 * Questions 1, 5, 7, 11, 13 are reverse scored
 */
export const GDS_QUESTIONS = [
  { id: 1, text: 'Are you basically satisfied with your life?', reverseScore: true },
  { id: 2, text: 'Have you dropped many of your activities and interests?', reverseScore: false },
  { id: 3, text: 'Do you feel that your life is empty?', reverseScore: false },
  { id: 4, text: 'Do you often get bored?', reverseScore: false },
  { id: 5, text: 'Are you in good spirits most of the time?', reverseScore: true },
  { id: 6, text: 'Are you afraid that something bad is going to happen to you?', reverseScore: false },
  { id: 7, text: 'Do you feel happy most of the time?', reverseScore: true },
  { id: 8, text: 'Do you often feel helpless?', reverseScore: false },
  { id: 9, text: 'Do you prefer to stay at home, rather than going out and doing new things?', reverseScore: false },
  { id: 10, text: 'Do you feel you have more problems with memory than most?', reverseScore: false },
  { id: 11, text: 'Do you think it is wonderful to be alive now?', reverseScore: true },
  { id: 12, text: 'Do you feel pretty worthless the way you are now?', reverseScore: false },
  { id: 13, text: 'Do you feel full of energy?', reverseScore: true },
  { id: 14, text: 'Do you feel that your situation is hopeless?', reverseScore: false },
  { id: 15, text: 'Do you think that most people are better off than you are?', reverseScore: false },
] as const;

export interface GDSAnswer {
  questionId: number;
  answer: boolean; // true = yes, false = no
}

export interface GDSAnswers {
  answers: GDSAnswer[];
}

export interface GDSResult {
  score: number; // 0-15
  severity: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
  interpretation: string;
  details: {
    answeredQuestions: number;
    totalQuestions: number;
    isComplete: boolean;
  };
}

/**
 * Calculate GDS score from answers
 * @param answers - Array of GDS answers
 * @returns GDS result with score, severity, and interpretation
 */
export function calculateGDSScore(answers: GDSAnswer[]): GDSResult {
  if (answers.length === 0) {
    return {
      score: 0,
      severity: 'Normal',
      interpretation: 'No answers provided',
      details: {
        answeredQuestions: 0,
        totalQuestions: 15,
        isComplete: false,
      },
    };
  }

  let score = 0;

  // Calculate score
  answers.forEach((answer) => {
    const question = GDS_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) {
      return;
    }

    if (question.reverseScore) {
      // For reverse-scored questions: No = 1 point
      score += answer.answer ? 0 : 1;
    } else {
      // For normal questions: Yes = 1 point
      score += answer.answer ? 1 : 0;
    }
  });

  // Determine severity
  let severity: GDSResult['severity'];
  let interpretation: string;

  if (score >= 0 && score <= 4) {
    severity = 'Normal';
    interpretation = 'Normal - No significant depressive symptoms';
  } else if (score >= 5 && score <= 8) {
    severity = 'Mild';
    interpretation = 'Mild depression - Consider clinical evaluation';
  } else if (score >= 9 && score <= 11) {
    severity = 'Moderate';
    interpretation = 'Moderate depression - Clinical evaluation recommended';
  } else {
    severity = 'Severe';
    interpretation = 'Severe depression - Immediate clinical evaluation required';
  }

  return {
    score,
    severity,
    interpretation,
    details: {
      answeredQuestions: answers.length,
      totalQuestions: 15,
      isComplete: answers.length === 15,
    },
  };
}

/**
 * Validate GDS answers
 */
export function validateGDSAnswers(answers: GDSAnswer[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (answers.length === 0) {
    errors.push('No answers provided');
  }

  if (answers.length > 15) {
    errors.push('Too many answers provided (max 15)');
  }

  // Check for duplicate question IDs
  const questionIds = answers.map((a) => a.questionId);
  const uniqueIds = new Set(questionIds);
  if (questionIds.length !== uniqueIds.size) {
    errors.push('Duplicate question answers detected');
  }

  // Check for invalid question IDs
  answers.forEach((answer) => {
    if (answer.questionId < 1 || answer.questionId > 15) {
      errors.push(`Invalid question ID: ${answer.questionId}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
