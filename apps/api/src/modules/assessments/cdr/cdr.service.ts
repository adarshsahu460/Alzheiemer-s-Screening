import { PrismaClient } from '@repo/db';
import { createCDRAssessmentSchema, type CreateCDRAssessmentInput } from '@repo/types';
import type { CDRAssessment, Assessment, User, Patient } from '@repo/db';

const prisma = new PrismaClient();

// CDR Domain names
const CDR_DOMAINS = [
  'Memory',
  'Orientation',
  'Judgment & Problem Solving',
  'Community Affairs',
  'Home & Hobbies',
  'Personal Care'
] as const;

// CDR Score values and their meanings
const CDR_SCORES = {
  0: 'None',
  0.5: 'Questionable',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe'
} as const;

type CDRScore = keyof typeof CDR_SCORES;

// Extended types for service responses
type CDRAssessmentWithRelations = Assessment & {
  cdrAssessment: CDRAssessment;
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'medicalRecordNumber'>;
  assessedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
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
function calculateGlobalCDR(domainScores: number[]): number {
  if (domainScores.length !== 6) {
    throw new Error('CDR requires exactly 6 domain scores');
  }

  const [memory, orientation, judgement, community, homeHobbies, personalCare] = domainScores;
  
  // All domains 0 = global CDR 0
  if (domainScores.every(score => score === 0)) {
    return 0;
  }

  // Special case: Memory = 0.5
  if (memory === 0.5) {
    const otherDomainsAboveZero = domainScores.slice(1).filter(s => s >= 0.5).length;
    return otherDomainsAboveZero >= 3 ? 0.5 : 0;
  }

  // Memory ≥ 1: Count how many domains differ from memory
  const secondaryDomains = domainScores.slice(1, 5); // Orientation through Home & Hobbies
  const higherCount = secondaryDomains.filter(s => s > memory).length;
  const lowerCount = secondaryDomains.filter(s => s < memory).length;

  // If at least 3 secondary domains are higher than memory
  if (higherCount >= 3) {
    // Move global CDR one level above memory
    if (memory === 1) return 2;
    if (memory === 2) return 3;
    return memory; // Can't go higher than 3
  }

  // If at least 3 secondary domains are lower than memory
  if (lowerCount >= 3) {
    // Move global CDR one level below memory
    if (memory === 3) return 2;
    if (memory === 2) return 1;
    if (memory === 1) return 0.5;
    return memory;
  }

  // Default: global CDR equals memory score
  return memory;
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
  return CDR_SCORES[globalCDR as CDRScore] || 'Unknown';
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
  async createAssessment(
    data: CreateCDRAssessmentInput
  ): Promise<CDRAssessmentWithRelations> {
    // Validate input
    const validatedData = createCDRAssessmentSchema.parse(data);

    // Validate domain scores
    validateDomainScores(validatedData.domainScores);

    // Calculate global CDR and sum of boxes
    const globalCDR = calculateGlobalCDR(validatedData.domainScores);
    const sumOfBoxes = calculateSumOfBoxes(validatedData.domainScores);

    // Create assessment with CDR data in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the base assessment
      const newAssessment = await tx.assessment.create({
        data: {
          patientId: validatedData.patientId,
          assessedById: validatedData.userId,
          type: 'CDR',
          cdrAssessment: {
            create: {
              memory: validatedData.domainScores[0],
              orientation: validatedData.domainScores[1],
              judgmentProblemSolving: validatedData.domainScores[2],
              communityAffairs: validatedData.domainScores[3],
              homeHobbies: validatedData.domainScores[4],
              personalCare: validatedData.domainScores[5],
              globalCDR,
              sumOfBoxes,
              notes: validatedData.notes,
            },
          },
        },
        include: {
          cdrAssessment: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
            },
          },
          assessedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Log the assessment creation
      await tx.auditLog.create({
        data: {
          userId: validatedData.userId,
          action: 'CREATE_ASSESSMENT',
          entityType: 'Assessment',
          entityId: newAssessment.id,
          details: `Created CDR assessment for patient ${validatedData.patientId}`,
        },
      });

      return newAssessment;
    });

    return assessment as CDRAssessmentWithRelations;
  }

  /**
   * Get a CDR assessment by ID
   */
  async getAssessmentById(assessmentId: string): Promise<CDRAssessmentWithRelations> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        cdrAssessment: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
        assessedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!assessment || !assessment.cdrAssessment) {
      throw new Error('CDR assessment not found');
    }

    return assessment as CDRAssessmentWithRelations;
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
        where: {
          patientId,
          type: 'CDR',
        },
        include: {
          cdrAssessment: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
            },
          },
          assessedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.assessment.count({
        where: {
          patientId,
          type: 'CDR',
        },
      }),
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
      where: {
        patientId,
        type: 'CDR',
      },
      include: {
        cdrAssessment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    const totalGlobalCDR = assessments.reduce(
      (sum, a) => sum + (a.cdrAssessment?.globalCDR || 0),
      0
    );
    const totalSumOfBoxes = assessments.reduce(
      (sum, a) => sum + (a.cdrAssessment?.sumOfBoxes || 0),
      0
    );

    const averageGlobalCDR = totalGlobalCDR / assessments.length;
    const averageSumOfBoxes = totalSumOfBoxes / assessments.length;

    // Get latest scores
    const latest = assessments[0].cdrAssessment;
    const latestGlobalCDR = latest?.globalCDR || null;
    const latestSumOfBoxes = latest?.sumOfBoxes || null;
    const latestStage = latestGlobalCDR !== null ? getCDRStageLabel(latestGlobalCDR) : null;

    // Build score history
    const scoreHistory = assessments.map((a) => ({
      date: a.createdAt.toISOString(),
      globalCDR: a.cdrAssessment?.globalCDR || 0,
      sumOfBoxes: a.cdrAssessment?.sumOfBoxes || 0,
    }));

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
          case 2: score = cdr.judgmentProblemSolving; break;
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
    const cdr = assessment.cdrAssessment;

    const scores = [
      cdr.memory,
      cdr.orientation,
      cdr.judgmentProblemSolving,
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

    const cdr1 = assessment1.cdrAssessment;
    const cdr2 = assessment2.cdrAssessment;

    const scores1 = [
      cdr1.memory,
      cdr1.orientation,
      cdr1.judgmentProblemSolving,
      cdr1.communityAffairs,
      cdr1.homeHobbies,
      cdr1.personalCare,
    ];

    const scores2 = [
      cdr2.memory,
      cdr2.orientation,
      cdr2.judgmentProblemSolving,
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
        globalCDRDifference: cdr2.globalCDR - cdr1.globalCDR,
        sumOfBoxesDifference: cdr2.sumOfBoxes - cdr1.sumOfBoxes,
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
