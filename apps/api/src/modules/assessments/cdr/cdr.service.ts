import { PrismaClient } from '@alzheimer/db';
import { calculateCDRScore, type CDRBoxScores, createCDRAssessmentSchema } from '@alzheimer/types';

const prisma = new PrismaClient();

// CDR Domain names (for stats/breakdowns)
const CDR_DOMAINS = [
  'Memory',
  'Orientation',
  'Judgment & Problem Solving',
  'Community Affairs',
  'Home & Hobbies',
  'Personal Care',
] as const;

// CDR Score values and their meanings
const CDR_SCORES: Record<number, string> = {
  0: 'None',
  0.5: 'Questionable',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
};

// Extended types for service responses
type CDRAssessmentWithRelations = {
  id: string;
  patientId: string;
  type: 'CDR';
  createdAt: Date;
  notes: string | null;
  cdrDetails: {
    memory: number;
    orientation: number;
    judgmentProblem: number;
    communityAffairs: number;
    homeHobbies: number;
    personalCare: number;
    globalScore: number;
    stage: string;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNo: string | null;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

interface DomainScore {
  domain: string;
  score: number;
  label: string;
}

interface CDRStats {
  total: number;
  averageGlobalCDR: number;
  averageSumOfBoxes: number;
  latestGlobalCDR: number | null;
  latestSumOfBoxes: number | null;
  latestStage: string | null;
  scoreHistory: Array<{
    date: string;
    globalCDR: number;
    sumOfBoxes: number;
  }>;
  domainStats: Array<{
    domain: string;
    averageScore: number;
    impairmentRate: number;
  }>;
}

interface ComparisonResult {
  assessment1: CDRAssessmentWithRelations;
  assessment2: CDRAssessmentWithRelations;
  comparison: {
    globalCDRDifference: number;
    sumOfBoxesDifference: number;
    domainChanges: Array<{
      domain: string;
      score1: number;
      score2: number;
      difference: number;
    }>;
  };
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface PaginatedResult {
  assessments: CDRAssessmentWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * CDR Global Score Calculation Algorithm
 * 
 * Standard CDR algorithm (Morris, 1993):
 * 1. If M (Memory) = 0.5, global CDR = 0.5 if at least 3 other domains are 0.5+
 * 2. If M = 0.5 and fewer than 3 other domains are 0.5+, global CDR = 0
 * 3. If M ≥ 1, global CDR = M unless at least 3 other domains score higher or lower
 * 4. When majority of domains differ from M:
 *    - If majority higher: global CDR = one level above M
 *    - If majority lower: global CDR = one level below M
 * 5. Ties are resolved in favor of M score
 * 
 * This implements the M-Rule (Memory Rule) algorithm
 */
function calculateGlobalCDRFromArray(domainScores: number[]): number {
  if (domainScores.length !== 6) {
    throw new Error('CDR requires exactly 6 domain scores');
  }
  const boxScores: CDRBoxScores = {
    memory: domainScores[0] as any,
    orientation: domainScores[1] as any,
    judgmentProblem: domainScores[2] as any,
    communityAffairs: domainScores[3] as any,
    homeHobbies: domainScores[4] as any,
    personalCare: domainScores[5] as any,
  };
  const result = calculateCDRScore(boxScores);
  return result.globalScore as number;
}

/**
 * Calculate Sum of Boxes
 * Simply sum all 6 domain scores
 * Range: 0-18
 */
function calculateSumOfBoxes(domainScores: number[]): number {
  if (domainScores.length !== 6) {
    throw new Error('CDR requires exactly 6 domain scores');
  }
  return domainScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Get CDR stage label
 */
function getCDRStageLabel(globalCDR: number): string {
  return CDR_SCORES[globalCDR] || 'Unknown';
}

/**
 * Validate domain scores
 */
function validateDomainScores(scores: number[]): void {
  if (scores.length !== 6) {
    throw new Error('CDR requires exactly 6 domain scores');
  }

  const validScores = [0, 0.5, 1, 2, 3];
  for (const score of scores) {
    if (!validScores.includes(score)) {
      throw new Error(`Invalid CDR score: ${score}. Must be 0, 0.5, 1, 2, or 3`);
    }
  }
}

export class CDRService {
  /**
   * Create a new CDR assessment
   */
  async createAssessment(data: { patientId: string; domainScores: number[]; notes?: string; userId: string }): Promise<CDRAssessmentWithRelations> {
    const validated = createCDRAssessmentSchema.parse({
      patientId: data.patientId,
      domainScores: data.domainScores,
      notes: data.notes,
    });

    validateDomainScores(validated.domainScores);

    const boxScores: CDRBoxScores = {
      memory: validated.domainScores[0] as any,
      orientation: validated.domainScores[1] as any,
      judgmentProblem: validated.domainScores[2] as any,
      communityAffairs: validated.domainScores[3] as any,
      homeHobbies: validated.domainScores[4] as any,
      personalCare: validated.domainScores[5] as any,
    };

    const calc = calculateCDRScore(boxScores);

    const assessment = await prisma.$transaction(async (tx) => {
      const newAssessment = await tx.assessment.create({
        data: {
          patientId: validated.patientId,
          createdById: data.userId,
          type: 'CDR',
          answers: { boxScores },
          notes: validated.notes,
          cdrDetails: {
            create: {
              memory: boxScores.memory,
              orientation: boxScores.orientation,
              judgmentProblem: boxScores.judgmentProblem,
              communityAffairs: boxScores.communityAffairs,
              homeHobbies: boxScores.homeHobbies,
              personalCare: boxScores.personalCare,
              globalScore: calc.globalScore as number,
              stage: calc.stage,
            },
          },
        },
        include: {
          cdrDetails: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNo: true,
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
      return newAssessment;
    });

    return assessment as unknown as CDRAssessmentWithRelations;
  }

  /**
   * Get a CDR assessment by ID
   */
  async getAssessmentById(assessmentId: string): Promise<CDRAssessmentWithRelations> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        cdrDetails: true,
        patient: { select: { id: true, firstName: true, lastName: true, medicalRecordNo: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!assessment || !assessment.cdrDetails) {
      throw new Error('CDR assessment not found');
    }

    return assessment as unknown as CDRAssessmentWithRelations;
  }

  /**
   * Get all CDR assessments for a patient
   */
  async getPatientAssessments(
    patientId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where: { patientId, type: 'CDR' },
        include: {
          cdrDetails: true,
          patient: { select: { id: true, firstName: true, lastName: true, medicalRecordNo: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assessment.count({ where: { patientId, type: 'CDR' } }),
    ]);

    return {
      assessments: assessments as CDRAssessmentWithRelations[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get CDR statistics for a patient
   */
  async getPatientStats(patientId: string): Promise<CDRStats> {
    const assessments = await prisma.assessment.findMany({
      where: { patientId, type: 'CDR' },
      include: { cdrDetails: true },
      orderBy: { createdAt: 'desc' },
    });

    if (assessments.length === 0) {
      return {
        total: 0,
        averageGlobalCDR: 0,
        averageSumOfBoxes: 0,
        latestGlobalCDR: null,
        latestSumOfBoxes: null,
        latestStage: null,
        scoreHistory: [],
        domainStats: [],
      };
    }

    // Calculate averages
    const totalGlobalCDR = assessments.reduce((sum, a) => sum + (a.cdrDetails?.globalScore || 0), 0);
    const totalSumOfBoxes = assessments.reduce((sum, a) => {
      const d = a.cdrDetails;
      if (!d) return sum;
      return sum + d.memory + d.orientation + d.judgmentProblem + d.communityAffairs + d.homeHobbies + d.personalCare;
    }, 0);

    const averageGlobalCDR = totalGlobalCDR / assessments.length;
    const averageSumOfBoxes = totalSumOfBoxes / assessments.length;

    // Get latest scores
    const latest = assessments[0].cdrDetails;
    const latestGlobalCDR = latest?.globalScore ?? null;
    const latestSumOfBoxes = latest
      ? latest.memory + latest.orientation + latest.judgmentProblem + latest.communityAffairs + latest.homeHobbies + latest.personalCare
      : null;
    const latestStage = latest?.stage ?? (latestGlobalCDR !== null ? getCDRStageLabel(latestGlobalCDR) : null);

    // Build score history
    const scoreHistory = assessments.map((a) => {
      const d = a.cdrDetails;
      const sob = d ? d.memory + d.orientation + d.judgmentProblem + d.communityAffairs + d.homeHobbies + d.personalCare : 0;
      return { date: a.createdAt.toISOString(), globalCDR: d?.globalScore || 0, sumOfBoxes: sob };
    });

    // Calculate domain statistics
    const domainStats = CDR_DOMAINS.map((domain, index) => {
      let totalScore = 0;
      let impairmentCount = 0;

      assessments.forEach((a) => {
        const cdr = a.cdrAssessment;
        if (!cdr) return;

        let score = 0;
        switch (index) {
          case 0: score = cdr.memory; break;
          case 1: score = cdr.orientation; break;
          case 2: score = cdr.judgmentProblem; break;
          case 3: score = cdr.communityAffairs; break;
          case 4: score = cdr.homeHobbies; break;
          case 5: score = cdr.personalCare; break;
        }

        totalScore += score;
        if (score > 0) impairmentCount++;
      });

      return {
        domain,
        averageScore: totalScore / assessments.length,
        impairmentRate: (impairmentCount / assessments.length) * 100,
      };
    });

    return {
      total: assessments.length,
      averageGlobalCDR,
      averageSumOfBoxes,
      latestGlobalCDR,
      latestSumOfBoxes,
      latestStage,
      scoreHistory,
      domainStats,
    };
  }

  /**
   * Get domain breakdown for a specific assessment
   */
  async getDomainBreakdown(assessmentId: string): Promise<DomainScore[]> {
    const assessment = await this.getAssessmentById(assessmentId);
    const cdr = assessment.cdrDetails;

    const scores = [
      cdr.memory,
      cdr.orientation,
      cdr.judgmentProblem,
      cdr.communityAffairs,
      cdr.homeHobbies,
      cdr.personalCare,
    ];

    return CDR_DOMAINS.map((domain, index) => ({
      domain,
      score: scores[index],
      label: getCDRStageLabel(scores[index]),
    }));
  }

  /**
   * Compare two CDR assessments
   */
  async compareAssessments(
    assessmentId1: string,
    assessmentId2: string
  ): Promise<ComparisonResult> {
    const [assessment1, assessment2] = await Promise.all([
      this.getAssessmentById(assessmentId1),
      this.getAssessmentById(assessmentId2),
    ]);

    // Ensure both assessments are for the same patient
    if (assessment1.patientId !== assessment2.patientId) {
      throw new Error('Cannot compare assessments from different patients');
    }

    const cdr1 = assessment1.cdrDetails;
    const cdr2 = assessment2.cdrDetails;

    const scores1 = [
      cdr1.memory,
      cdr1.orientation,
      cdr1.judgmentProblem,
      cdr1.communityAffairs,
      cdr1.homeHobbies,
      cdr1.personalCare,
    ];

    const scores2 = [
      cdr2.memory,
      cdr2.orientation,
      cdr2.judgmentProblem,
      cdr2.communityAffairs,
      cdr2.homeHobbies,
      cdr2.personalCare,
    ];

    const domainChanges = CDR_DOMAINS.map((domain, index) => ({
      domain,
      score1: scores1[index],
      score2: scores2[index],
      difference: scores2[index] - scores1[index],
    }));

    return {
      assessment1,
      assessment2,
      comparison: {
        globalCDRDifference: cdr2.globalScore - cdr1.globalScore,
        sumOfBoxesDifference:
          (cdr2.memory + cdr2.orientation + cdr2.judgmentProblem + cdr2.communityAffairs + cdr2.homeHobbies + cdr2.personalCare) -
          (cdr1.memory + cdr1.orientation + cdr1.judgmentProblem + cdr1.communityAffairs + cdr1.homeHobbies + cdr1.personalCare),
        domainChanges,
      },
    };
  }

  /**
   * Delete a CDR assessment
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete the CDR assessment data
      await tx.cDRAssessment.deleteMany({
        where: { assessmentId },
      });

      // Delete the base assessment
      await tx.assessment.delete({
        where: { id: assessmentId },
      });
    });
  }

  /**
   * Get CDR distribution for a patient (how many times at each global CDR level)
   */
  async getCDRDistribution(patientId: string): Promise<Record<string, number>> {
    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        type: 'CDR',
      },
      include: {
        cdrAssessment: true,
      },
    });

    const distribution: Record<string, number> = {
      '0': 0,
      '0.5': 0,
      '1': 0,
      '2': 0,
      '3': 0,
    };

    assessments.forEach((a) => {
      if (a.cdrAssessment) {
        const key = a.cdrAssessment.globalCDR.toString();
        distribution[key] = (distribution[key] || 0) + 1;
      }
    });

    return distribution;
  }
}

export const cdrService = new CDRService();
