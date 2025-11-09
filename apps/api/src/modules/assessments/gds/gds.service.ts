import { PrismaClient, GDSAssessment, Assessment } from '@repo/db';
import {
  calculateGDSScore,
  validateGDSAnswers,
  GDS_QUESTIONS,
  type GDSAnswers,
} from '@repo/types';

const prisma = new PrismaClient();

interface CreateGDSInput {
  patientId: string;
  answers: GDSAnswers;
  assessedById: string;
  notes?: string;
}

export class GDSService {
  /**
   * Create a new GDS assessment with automatic scoring
   */
  async createAssessment(data: CreateGDSInput) {
    const { patientId, answers, assessedById, notes } = data;

    // Validate answers
    const validation = validateGDSAnswers(answers.answers);
    if (!validation.isValid) {
      throw new Error(`Invalid GDS answers: ${validation.errors.join(', ')}`);
    }

    // Calculate score
    const scoreResult = calculateGDSScore(answers.answers);

    // Create assessment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create base assessment
      const assessment = await tx.assessment.create({
        data: {
          type: 'GDS',
          patientId,
          createdById: assessedById,
          answers: answers as any,
          notes,
        },
      });

      // Create GDS-specific assessment
      const gdsAssessment = await tx.gDSAssessment.create({
        data: {
          assessmentId: assessment.id,
          score: scoreResult.score,
          severity: scoreResult.severity,
        },
      });

      return { assessment, gdsAssessment };
    });

    // Create audit log
    await this.createAuditLog({
      userId: assessedById,
      action: 'CREATE',
      entityType: 'ASSESSMENT',
      entityId: result.assessment.id,
      details: {
        patientId,
        score: scoreResult.score,
        severity: scoreResult.severity,
      },
    });

    return this.getAssessmentById(result.assessment.id);
  }

  /**
   * Get GDS assessment by ID with all related data
   */
  async getAssessmentById(id: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id, type: 'GDS' },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            medicalRecordNo: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        gdsDetails: true,
      },
    });

    if (!assessment) {
      throw new Error('GDS assessment not found');
    }

    return assessment;
  }

  /**
   * Get all GDS assessments for a patient
   */
  async getPatientAssessments(
    patientId: string,
    options?: {
      limit?: number;
      skip?: number;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const { limit = 10, skip = 0, sortOrder = 'desc' } = options || {};

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where: {
          patientId,
          type: 'GDS',
        },
        include: {
          gdsDetails: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: sortOrder,
        },
        take: limit,
        skip,
      }),
      prisma.assessment.count({
        where: {
          patientId,
          type: 'GDS',
        },
      }),
    ]);

    return {
      data: assessments,
      total,
      hasMore: skip + assessments.length < total,
    };
  }

  /**
   * Get GDS assessment statistics for a patient
   */
  async getPatientStats(patientId: string) {
    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        type: 'GDS',
      },
      include: {
        gdsDetails: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (assessments.length === 0) {
      return {
        total: 0,
        averageScore: 0,
        latestScore: null,
        latestSeverity: null,
        scoreHistory: [],
      };
    }

    const scores = assessments.map((a) => a.gdsDetails?.score || 0);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const latest = assessments[assessments.length - 1];

    return {
      total: assessments.length,
      averageScore: Math.round(averageScore * 10) / 10,
      latestScore: latest.gdsDetails?.score || null,
      latestSeverity: latest.gdsDetails?.severity || null,
      scoreHistory: assessments.map((a) => ({
        date: a.createdAt,
        score: a.gdsDetails?.score || 0,
        severity: a.gdsDetails?.severity || 'NORMAL',
      })),
    };
  }

  /**
   * Get question breakdown for an assessment
   */
  getQuestionBreakdown(answers: GDSAnswers) {
    return GDS_QUESTIONS.map((question, index) => ({
      number: index + 1,
      question: question.question,
      answer: answers[index] ? 'Yes' : 'No',
      reverseScored: question.reverseScored,
      contributesToScore: question.reverseScored
        ? !answers[index]
        : answers[index],
    }));
  }

  /**
   * Compare two assessments to show progress
   */
  async compareAssessments(assessmentId1: string, assessmentId2: string) {
    const [assessment1, assessment2] = await Promise.all([
      this.getAssessmentById(assessmentId1),
      this.getAssessmentById(assessmentId2),
    ]);

    const score1 = assessment1.gdsDetails?.score || 0;
    const score2 = assessment2.gdsDetails?.score || 0;
    const scoreDifference = score2 - score1;

    return {
      assessment1: {
        id: assessment1.id,
        date: assessment1.createdAt,
        score: score1,
        severity: assessment1.gdsDetails?.severity,
      },
      assessment2: {
        id: assessment2.id,
        date: assessment2.createdAt,
        score: score2,
        severity: assessment2.gdsDetails?.severity,
      },
      scoreDifference,
      improvement: scoreDifference < 0, // Lower score is better
      percentChange:
        score1 > 0 ? Math.round((scoreDifference / score1) * 100) : 0,
    };
  }

  /**
   * Delete GDS assessment
   */
  async deleteAssessment(id: string, deletedById: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id, type: 'GDS' },
      include: {
        gdsDetails: true,
      },
    });

    if (!assessment) {
      throw new Error('GDS assessment not found');
    }

    // Create audit log before deletion
    await this.createAuditLog({
      userId: deletedById,
      action: 'DELETE',
      entityType: 'ASSESSMENT',
      entityId: id,
      details: {
        score: assessment.gdsDetails?.score,
        severity: assessment.gdsDetails?.severity,
      },
    });

    // Delete GDS assessment (will cascade to base assessment)
    await prisma.gDSAssessment.delete({
      where: { assessmentId: id },
    });
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.details || {},
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

export const gdsService = new GDSService();
