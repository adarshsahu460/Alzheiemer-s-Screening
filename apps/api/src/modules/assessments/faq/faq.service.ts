import { db } from '@repo/db';
import { 
  FAQ_ITEMS, 
  calculateFAQScore, 
  validateFAQAnswers,
  type FAQAnswer 
} from '@repo/types';
import type { Prisma } from '@repo/db';

export interface CreateFAQAssessmentInput {
  patientId: string;
  assessedById: string;
  answers: FAQAnswer[];
  notes?: string;
}

export interface GetPatientAssessmentsOptions {
  limit?: number;
  skip?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface ItemBreakdown {
  item: string;
  itemNumber: number;
  description: string;
  score: number;
  scoreLabel: string;
}

export interface FAQStats {
  total: number;
  averageScore: number;
  latestScore: number | null;
  latestImpairment: string | null;
  scoreHistory: Array<{
    date: Date;
    totalScore: number;
    impairment: string;
  }>;
  itemStats: Array<{
    item: string;
    itemNumber: number;
    averageScore: number;
    impairmentRate: number; // percentage of assessments where score > 0
  }>;
}

export interface ComparisonResult {
  assessment1: {
    id: string;
    date: Date;
    totalScore: number;
    impairment: string;
  };
  assessment2: {
    id: string;
    date: Date;
    totalScore: number;
    impairment: string;
  };
  scoreDifference: number;
  improvement: boolean;
  percentChange: number;
  itemChanges: Array<{
    item: string;
    itemNumber: number;
    scoreDifference: number;
  }>;
}

export class FAQService {
  /**
   * Create a new FAQ assessment
   */
  async createAssessment(data: CreateFAQAssessmentInput) {
    // Validate answers
    const validation = validateFAQAnswers(data.answers);
    if (!validation.valid) {
      throw new Error(`Invalid FAQ answers: ${validation.error}`);
    }

    // Calculate total score and impairment level
    const { totalScore, impairmentLevel } = calculateFAQScore(data.answers);

    // Create assessment and FAQ assessment in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create base assessment
      const assessment = await tx.assessment.create({
        data: {
          type: 'FAQ',
          patientId: data.patientId,
          assessedById: data.assessedById,
          notes: data.notes,
        },
      });

      // Create FAQ assessment with item scores
      const faqAssessment = await tx.fAQAssessment.create({
        data: {
          assessmentId: assessment.id,
          totalScore,
          item1Score: data.answers[0],
          item2Score: data.answers[1],
          item3Score: data.answers[2],
          item4Score: data.answers[3],
          item5Score: data.answers[4],
          item6Score: data.answers[5],
          item7Score: data.answers[6],
          item8Score: data.answers[7],
          item9Score: data.answers[8],
          item10Score: data.answers[9],
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'ASSESSMENT',
          entityId: assessment.id,
          userId: data.assessedById,
          metadata: {
            type: 'FAQ',
            patientId: data.patientId,
            totalScore,
            impairmentLevel,
          },
        },
      });

      return { assessment, faqAssessment };
    });

    // Return the created assessment with relations
    return this.getAssessmentById(result.assessment.id);
  }

  /**
   * Get an FAQ assessment by ID
   */
  async getAssessmentById(id: string) {
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            medicalRecordNumber: true,
          },
        },
        assessedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        faqAssessment: true,
      },
    });

    if (!assessment || assessment.type !== 'FAQ') {
      throw new Error('FAQ assessment not found');
    }

    return assessment;
  }

  /**
   * Get all FAQ assessments for a patient
   */
  async getPatientAssessments(
    patientId: string,
    options: GetPatientAssessmentsOptions = {}
  ) {
    const { limit = 10, skip = 0, sortOrder = 'desc' } = options;

    const assessments = await db.assessment.findMany({
      where: {
        patientId,
        type: 'FAQ',
      },
      include: {
        assessedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        faqAssessment: true,
      },
      orderBy: {
        createdAt: sortOrder,
      },
      take: limit,
      skip,
    });

    const total = await db.assessment.count({
      where: {
        patientId,
        type: 'FAQ',
      },
    });

    return {
      assessments,
      total,
      limit,
      skip,
    };
  }

  /**
   * Get statistics for a patient's FAQ assessments
   */
  async getPatientStats(patientId: string): Promise<FAQStats> {
    const assessments = await db.assessment.findMany({
      where: {
        patientId,
        type: 'FAQ',
      },
      include: {
        faqAssessment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (assessments.length === 0) {
      return {
        total: 0,
        averageScore: 0,
        latestScore: null,
        latestImpairment: null,
        scoreHistory: [],
        itemStats: FAQ_ITEMS.map((item, index) => ({
          item: item.description,
          itemNumber: index + 1,
          averageScore: 0,
          impairmentRate: 0,
        })),
      };
    }

    // Calculate averages
    const totalScore = assessments.reduce((sum, a) => sum + (a.faqAssessment?.totalScore || 0), 0);
    const averageScore = totalScore / assessments.length;

    // Get latest score and impairment
    const latestAssessment = assessments[0];
    const latestScore = latestAssessment.faqAssessment?.totalScore || null;
    const latestImpairment = latestScore !== null 
      ? this.getImpairmentLevel(latestScore) 
      : null;

    // Build score history
    const scoreHistory = assessments.map(a => ({
      date: a.createdAt,
      totalScore: a.faqAssessment?.totalScore || 0,
      impairment: this.getImpairmentLevel(a.faqAssessment?.totalScore || 0),
    }));

    // Calculate item statistics
    const itemStats = FAQ_ITEMS.map((item, index) => {
      const itemKey = `item${index + 1}Score` as keyof typeof assessments[0]['faqAssessment'];
      let totalItemScore = 0;
      let impairmentCount = 0;

      assessments.forEach(assessment => {
        const faq = assessment.faqAssessment;
        if (!faq) return;

        const score = faq[itemKey] as number;
        totalItemScore += score;
        if (score > 0) {
          impairmentCount++;
        }
      });

      return {
        item: item.description,
        itemNumber: index + 1,
        averageScore: totalItemScore / assessments.length,
        impairmentRate: (impairmentCount / assessments.length) * 100,
      };
    });

    return {
      total: assessments.length,
      averageScore,
      latestScore,
      latestImpairment,
      scoreHistory,
      itemStats,
    };
  }

  /**
   * Get detailed breakdown of item scores for an assessment
   */
  async getItemBreakdown(assessmentId: string): Promise<ItemBreakdown[]> {
    const assessment = await this.getAssessmentById(assessmentId);
    const faq = assessment.faqAssessment;

    if (!faq) {
      throw new Error('FAQ assessment data not found');
    }

    return FAQ_ITEMS.map((item, index) => {
      const itemKey = `item${index + 1}Score` as keyof typeof faq;
      const score = faq[itemKey] as number;

      return {
        item: item.description,
        itemNumber: index + 1,
        description: item.examples || '',
        score,
        scoreLabel: this.getScoreLabel(score),
      };
    });
  }

  /**
   * Compare two FAQ assessments
   */
  async compareAssessments(id1: string, id2: string): Promise<ComparisonResult> {
    const [assessment1, assessment2] = await Promise.all([
      this.getAssessmentById(id1),
      this.getAssessmentById(id2),
    ]);

    const faq1 = assessment1.faqAssessment;
    const faq2 = assessment2.faqAssessment;

    if (!faq1 || !faq2) {
      throw new Error('FAQ assessment data not found');
    }

    const scoreDifference = faq2.totalScore - faq1.totalScore;
    const improvement = scoreDifference < 0; // Lower score is improvement
    const percentChange = faq1.totalScore > 0 
      ? (scoreDifference / faq1.totalScore) * 100 
      : 0;

    // Calculate item-level changes
    const itemChanges = FAQ_ITEMS.map((item, index) => {
      const itemKey = `item${index + 1}Score` as keyof typeof faq1;
      const score1 = faq1[itemKey] as number;
      const score2 = faq2[itemKey] as number;

      return {
        item: item.description,
        itemNumber: index + 1,
        scoreDifference: score2 - score1,
      };
    });

    return {
      assessment1: {
        id: assessment1.id,
        date: assessment1.createdAt,
        totalScore: faq1.totalScore,
        impairment: this.getImpairmentLevel(faq1.totalScore),
      },
      assessment2: {
        id: assessment2.id,
        date: assessment2.createdAt,
        totalScore: faq2.totalScore,
        impairment: this.getImpairmentLevel(faq2.totalScore),
      },
      scoreDifference,
      improvement,
      percentChange,
      itemChanges,
    };
  }

  /**
   * Delete an FAQ assessment
   */
  async deleteAssessment(id: string, deletedById: string) {
    const assessment = await this.getAssessmentById(id);

    await db.$transaction(async (tx) => {
      // Delete FAQ assessment (cascades from base assessment)
      await tx.assessment.delete({
        where: { id },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'DELETE',
          entityType: 'ASSESSMENT',
          entityId: id,
          userId: deletedById,
          metadata: {
            type: 'FAQ',
            patientId: assessment.patientId,
            totalScore: assessment.faqAssessment?.totalScore,
          },
        },
      });
    });

    return { success: true };
  }

  /**
   * Helper: Get impairment level from total score
   */
  private getImpairmentLevel(score: number): string {
    if (score === 0) return 'No Impairment';
    if (score <= 5) return 'Mild Impairment';
    if (score <= 15) return 'Moderate Impairment';
    if (score <= 25) return 'Severe Impairment';
    return 'Very Severe Impairment';
  }

  /**
   * Helper: Get score label from item score
   */
  private getScoreLabel(score: number): string {
    switch (score) {
      case 0: return 'Normal';
      case 1: return 'Has Difficulty';
      case 2: return 'Requires Assistance';
      case 3: return 'Dependent';
      default: return 'Unknown';
    }
  }
}

export const faqService = new FAQService();
