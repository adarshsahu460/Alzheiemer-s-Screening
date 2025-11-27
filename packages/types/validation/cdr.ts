import { z } from 'zod';

// Allowed CDR box scores
export const cdrBoxScoreSchema = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

// Schema for creating a CDR assessment
export const createCDRAssessmentSchema = z.object({
  patientId: z.string().cuid(),
  // Six domain scores in order: memory, orientation, judgmentProblem, communityAffairs, homeHobbies, personalCare
  domainScores: z.array(cdrBoxScoreSchema).length(6),
  notes: z.string().max(2000).optional(),
});

export type CreateCDRAssessmentInput = z.infer<typeof createCDRAssessmentSchema> & { userId?: string };
