import { PrismaClient, NPIAssessment, Assessment } from '@alzheimer/db';
import { calculateNPIScore, validateNPIScores, NPI_DOMAINS } from '@alzheimer/types';
import type { NPIDomainScore } from '@alzheimer/types';
import type { Prisma } from '@alzheimer/db';

const prisma = new PrismaClient();

export interface CreateNPIAssessmentInput {
  patientId: string;
  assessedById: string;
  domainScores: NPIDomainScore[];
  notes?: string;
}

export interface GetPatientAssessmentsOptions {
  limit?: number;
  skip?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface DomainBreakdown {
  domain: string;
  domainId: number;
  isPresent: boolean;
  frequency: number | null;
  severity: number | null;
  domainScore: number;
  distress: number | null;
}

export interface NPIStats {
  total: number;
  averageScore: number;
  averageTotalDistress: number;
  latestScore: number | null;
  latestTotalDistress: number | null;
  scoreHistory: Array<{
    date: Date;
    totalScore: number;
    totalDistress: number;
  }>;
  domainStats: Array<{
    domain: string;
    domainId: number;
    averageScore: number;
    averageDistress: number;
    presenceRate: number; // percentage of assessments where domain is present
  }>;
}

export interface ComparisonResult {
  assessment1: {
    id: string;
    date: Date;
    totalScore: number;
    totalDistress: number;
  };
  assessment2: {
    id: string;
    date: Date;
    totalScore: number;
    totalDistress: number;
  };
  scoreDifference: number;
  distressDifference: number;
  improvement: boolean;
  percentChange: number;
  domainChanges: Array<{
    domain: string;
    domainId: number;
    scoreDifference: number;
    distressDifference: number;
  }>;
}

export class NPIService {
  /**
   * Create a new NPI assessment
   */
  async createAssessment(data: CreateNPIAssessmentInput) {
    // Validate domain scores
    const validation = validateNPIScores(data.domainScores);
    if (!validation.isValid) {
      throw new Error(`Invalid NPI domain scores: ${validation.errors.join(', ')} `);
    }

    // Calculate total score and distress
    const { totalScore, totalDistress, domainScores } = calculateNPIScore(data.domainScores);

    // Create a map of domain scores by domainId for easy lookup
    const domainMap = new Map(domainScores.map(d => [d.domainId, d]));

    // Helper to get domain data or null
    const getDomain = (id: number) => domainMap.get(id);

    // Create assessment and NPI assessment in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create base assessment
      const assessment = await tx.assessment.create({
        data: {
          type: 'NPI',
          patientId: data.patientId,
          createdById: data.assessedById,
          answers: { domains: data.domainScores },
          notes: data.notes,
        },
      });

      // Create NPI assessment with domain scores
      const d1 = getDomain(1);
      const d2 = getDomain(2);
      const d3 = getDomain(3);
      const d4 = getDomain(4);
      const d5 = getDomain(5);
      const d6 = getDomain(6);
      const d7 = getDomain(7);
      const d8 = getDomain(8);
      const d9 = getDomain(9);
      const d10 = getDomain(10);
      const d11 = getDomain(11);
      const d12 = getDomain(12);

      const npiAssessment = await tx.nPIAssessment.create({
        data: {
          assessmentId: assessment.id,
          totalScore,
          domainScores: domainScores,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'ASSESSMENT',
          entityId: assessment.id,
          userId: data.assessedById,
          changes: {
            type: 'NPI',
            patientId: data.patientId,
            totalScore,
            totalDistress,
          },
        },
      });

      return { assessment, npiAssessment };
    });

    // Return complete assessment with relations
    return this.getAssessment(result.assessment.id);
  }

  /**
   * Get a single NPI assessment by ID with full details
   */
  async getAssessment(id: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
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
        npiDetails: true,
      },
    });

    if (!assessment || assessment.type !== 'NPI') {
      throw new Error('NPI assessment not found');
    }

    return assessment;
  }

  /**
   * Get all NPI assessments for a patient
   */
  async getPatientAssessments(
    patientId: string,
    options: GetPatientAssessmentsOptions = {}
  ) {
    const { limit = 10, skip = 0, sortOrder = 'desc' } = options;

    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        type: 'NPI',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        npiDetails: true,
      },
      orderBy: {
        createdAt: sortOrder,
      },
      take: limit,
      skip,
    });

    const total = await prisma.assessment.count({
      where: {
        patientId,
        type: 'NPI',
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
   * Get NPI statistics for a patient
   */
  async getPatientStats(patientId: string) {
    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        type: 'NPI',
      },
      include: {
        npiDetails: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (assessments.length === 0) {
      return {
        total: 0,
        averageScore: 0,
        averageTotalDistress: 0,
        latestScore: null,
        latestTotalDistress: null,
        scoreHistory: [],
        domainStats: NPI_DOMAINS.map(domain => ({
          domain: domain.name,
          domainId: domain.id,
          averageScore: 0,
          averageDistress: 0,
          presenceRate: 0,
        })),
      };
    }

    // Helper to calculate total distress from domain scores
    const calculateTotalDistress = (domains: any[]) => {
      return domains.reduce((sum: number, d: any) => sum + (d.distress || 0), 0);
    };

    // Calculate averages
    const totalScore = assessments.reduce((sum: number, a: any) => sum + (a.npiDetails?.totalScore || 0), 0);
    const totalDistress = assessments.reduce((sum: number, a: any) => {
      const domains = (a.npiDetails?.domainScores as any[]) || [];
      return sum + calculateTotalDistress(domains);
    }, 0);
    const averageScore = totalScore / assessments.length;
    const averageTotalDistress = totalDistress / assessments.length;

    // Get latest scores
    const latestAssessment = assessments[0];
    const latestScore = latestAssessment.npiDetails?.totalScore || null;
    const latestDomains = (latestAssessment.npiDetails?.domainScores as any[]) || [];
    const latestTotalDistress = calculateTotalDistress(latestDomains);

    // Build score history
    const scoreHistory = assessments.map((a: any) => {
      const domains = (a.npiDetails?.domainScores as any[]) || [];
      return {
        date: a.createdAt,
        totalScore: a.npiDetails?.totalScore || 0,
        totalDistress: calculateTotalDistress(domains),
      };
    });

    // Calculate domain statistics
    const domainStats = NPI_DOMAINS.map(domain => {
      const domainId = domain.id;
      let totalDomainScore = 0;
      let totalDomainDistress = 0;
      let presenceCount = 0;

      assessments.forEach((assessment: any) => {
        const domains = (assessment.npiDetails?.domainScores as any[]) || [];
        const domainData = domains.find((d: any) => d.domainId === domainId);

        if (domainData) {
          presenceCount++;
          totalDomainScore += domainData.score || 0;
          totalDomainDistress += domainData.distress || 0;
        }
      });

      return {
        domain: domain.name,
        domainId,
        averageScore: presenceCount > 0 ? totalDomainScore / presenceCount : 0,
        averageDistress: presenceCount > 0 ? totalDomainDistress / presenceCount : 0,
        presenceRate: (presenceCount / assessments.length) * 100,
      };
    });

    return {
      total: assessments.length,
      averageScore,
      averageTotalDistress,
      latestScore,
      latestTotalDistress,
      scoreHistory,
      domainStats,
    };
  }

  /**
   * Get detailed breakdown of domain scores for an assessment
   */
  async getDomainBreakdown(assessmentId: string): Promise<DomainBreakdown[]> {
    const assessment = await this.getAssessment(assessmentId);
    const npi = assessment.npiDetails;

    if (!npi) {
      throw new Error('NPI assessment data not found');
    }

    const domains = (npi.domainScores as any[]) || [];

    return NPI_DOMAINS.map(domain => {
      const domainData = domains.find((d: any) => d.domainId === domain.id);

      if (!domainData) {
        return {
          domain: domain.name,
          domainId: domain.id,
          isPresent: false,
          frequency: null,
          severity: null,
          domainScore: 0,
          distress: null,
        };
      }

      return {
        domain: domain.name,
        domainId: domain.id,
        isPresent: true,
        frequency: domainData.frequency,
        severity: domainData.severity,
        domainScore: domainData.score,
        distress: domainData.distress,
      };
    });
  }

  /**
   * Compare two NPI assessments
   */
  async compareAssessments(id1: string, id2: string): Promise<ComparisonResult> {
    const [assessment1, assessment2] = await Promise.all([
      this.getAssessment(id1),
      this.getAssessment(id2),
    ]);

    const npi1 = assessment1.npiDetails;
    const npi2 = assessment2.npiDetails;

    if (!npi1 || !npi2) {
      throw new Error('NPI assessment data not found');
    }

    // Calculate total distress from domain scores
    const domains1 = (npi1.domainScores as any[]) || [];
    const domains2 = (npi2.domainScores as any[]) || [];
    const totalDistress1 = domains1.reduce((sum: number, d: any) => sum + (d.distress || 0), 0);
    const totalDistress2 = domains2.reduce((sum: number, d: any) => sum + (d.distress || 0), 0);

    const scoreDifference = npi2.totalScore - npi1.totalScore;
    const distressDifference = totalDistress2 - totalDistress1;
    const improvement = scoreDifference < 0; // Lower score is improvement
    const percentChange = npi1.totalScore > 0
      ? (scoreDifference / npi1.totalScore) * 100
      : 0;

    // Calculate domain-level changes
    const domainChanges = NPI_DOMAINS.map(domain => {
      const domainId = domain.id;

      const domain1Data = domains1.find((d: any) => d.domainId === domainId);
      const domain2Data = domains2.find((d: any) => d.domainId === domainId);

      const score1 = domain1Data?.score || 0;
      const score2 = domain2Data?.score || 0;
      const distress1 = domain1Data?.distress || 0;
      const distress2 = domain2Data?.distress || 0;

      return {
        domain: domain.name,
        domainId,
        scoreDifference: score2 - score1,
        distressDifference: distress2 - distress1,
      };
    });

    return {
      assessment1: {
        id: assessment1.id,
        date: assessment1.createdAt,
        totalScore: npi1.totalScore,
        totalDistress: totalDistress1,
      },
      assessment2: {
        id: assessment2.id,
        date: assessment2.createdAt,
        totalScore: npi2.totalScore,
        totalDistress: totalDistress2,
      },
      scoreDifference,
      distressDifference,
      improvement,
      percentChange,
      domainChanges,
    };
  }

  /**
   * Delete an NPI assessment
   */
  async deleteAssessment(id: string, deletedById: string) {
    const assessment = await this.getAssessment(id);

    await prisma.$transaction(async (tx: any) => {
      // Delete NPI assessment (cascades from base assessment)
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
          changes: {
            type: 'NPI',
            patientId: assessment.patientId,
            totalScore: assessment.npiDetails?.totalScore,
          },
        },
      });
    });

    return { success: true };
  }

  /**
   * Helper: Calculate domain score from NPI assessment
   */
  private calculateDomainScore(npi: any, domainKey: string): number {
    const isPresent = npi[`${domainKey} Present`] as boolean;
    const frequency = npi[`${domainKey} Frequency`] as number | null;
    const severity = npi[`${domainKey} Severity`] as number | null;

    return isPresent && frequency !== null && severity !== null
      ? frequency * severity
      : 0;
  }
}

export const npiService = new NPIService();
