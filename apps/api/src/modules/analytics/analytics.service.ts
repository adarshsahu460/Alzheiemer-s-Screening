import { PrismaClient } from '@repo/db';
import type { Assessment } from '@repo/db';

const prisma = new PrismaClient();

// Types for analytics
export interface PatientOverview {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNo: string;
    dateOfBirth: Date;
    age: number;
  };
  assessmentCounts: {
    gds: number;
    npi: number;
    faq: number;
    cdr: number;
    total: number;
  };
  latestAssessments: {
    gds: LatestAssessmentSummary | null;
    npi: LatestAssessmentSummary | null;
    faq: LatestAssessmentSummary | null;
    cdr: LatestAssessmentSummary | null;
  };
  alerts: Alert[];
  trends: TrendSummary;
}

interface LatestAssessmentSummary {
  id: string;
  date: Date;
  score: number | string;
  severity: string;
}

interface Alert {
  type: 'warning' | 'danger' | 'info';
  category: string;
  message: string;
  priority: number;
}

interface TrendSummary {
  overallTrend: 'improving' | 'stable' | 'declining' | 'rapidly_declining';
  gds: TrendDirection;
  npi: TrendDirection;
  faq: TrendDirection;
  cdr: TrendDirection;
  notes: string[];
}

interface TrendDirection {
  direction: 'improving' | 'stable' | 'worsening';
  changeRate: number;
  significance: 'none' | 'mild' | 'moderate' | 'severe';
}

export interface CrossAssessmentCorrelation {
  patientId: string;
  correlations: {
    gdsNpi: CorrelationData;
    gdsFaq: CorrelationData;
    gdsCdr: CorrelationData;
    npiFaq: CorrelationData;
    npiCdr: CorrelationData;
    faqCdr: CorrelationData;
  };
  insights: string[];
}

interface CorrelationData {
  correlation: number; // -1 to 1
  strength: 'none' | 'weak' | 'moderate' | 'strong';
  pValue: number;
  sampleSize: number;
}

export interface ProgressionReport {
  patientId: string;
  timeRange: {
    start: Date;
    end: Date;
    durationDays: number;
  };
  gdsProgression: AssessmentProgression[];
  npiProgression: AssessmentProgression[];
  faqProgression: AssessmentProgression[];
  cdrProgression: AssessmentProgression[];
  milestones: Milestone[];
  recommendations: string[];
}

interface AssessmentProgression {
  date: Date;
  score: number;
  change: number;
  percentChange: number;
}

interface Milestone {
  date: Date;
  event: string;
  significance: 'low' | 'medium' | 'high';
  description: string;
}

export class AnalyticsService {
  /**
   * Get comprehensive patient overview with all assessment data
   */
  async getPatientOverview(patientId: string): Promise<PatientOverview> {
    // Fetch patient
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Calculate age
    const age = this.calculateAge(patient.dateOfBirth);

    // Get all assessments for the patient
    const assessments = await prisma.assessment.findMany({
      where: { patientId },
      include: {
        gdsDetails: true,
        npiDetails: true,
        faqDetails: true,
        cdrDetails: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count assessments by type
    const assessmentCounts = {
      gds: assessments.filter((a) => a.type === 'GDS').length,
      npi: assessments.filter((a) => a.type === 'NPI').length,
      faq: assessments.filter((a) => a.type === 'FAQ').length,
      cdr: assessments.filter((a) => a.type === 'CDR').length,
      total: assessments.length,
    };

    // Get latest assessments
    const latestGDS = assessments.find((a) => a.type === 'GDS' && a.gdsDetails);
    const latestNPI = assessments.find((a) => a.type === 'NPI' && a.npiDetails);
    const latestFAQ = assessments.find((a) => a.type === 'FAQ' && a.faqDetails);
    const latestCDR = assessments.find((a) => a.type === 'CDR' && a.cdrDetails);

    const latestAssessments = {
      gds: latestGDS
        ? {
            id: latestGDS.id,
            date: latestGDS.createdAt,
            score: latestGDS.gdsDetails!.score,
            severity: this.getGDSSeverity(latestGDS.gdsDetails!.score),
          }
        : null,
      npi: latestNPI
        ? {
            id: latestNPI.id,
            date: latestNPI.createdAt,
            score: latestNPI.npiDetails!.totalScore,
            severity: this.getNPISeverity(latestNPI.npiDetails!.totalScore),
          }
        : null,
      faq: latestFAQ
        ? {
            id: latestFAQ.id,
            date: latestFAQ.createdAt,
            score: latestFAQ.faqDetails!.totalScore,
            severity: this.getFAQSeverity(latestFAQ.faqDetails!.totalScore),
          }
        : null,
      cdr: latestCDR
        ? {
            id: latestCDR.id,
            date: latestCDR.createdAt,
            score: `${latestCDR.cdrDetails!.globalScore} (SOB: ${
              latestCDR.cdrDetails!.memory +
              latestCDR.cdrDetails!.orientation +
              latestCDR.cdrDetails!.judgmentProblem +
              latestCDR.cdrDetails!.communityAffairs +
              latestCDR.cdrDetails!.homeHobbies +
              latestCDR.cdrDetails!.personalCare
            })`,
            severity: this.getCDRSeverity(latestCDR.cdrDetails!.globalScore),
          }
        : null,
    };

    // Generate alerts based on latest scores
    const alerts = this.generateAlerts(latestAssessments);

    // Calculate trends
    const trends = await this.calculateTrends(patientId, assessments);

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        medicalRecordNo: patient.medicalRecordNo || '',
        dateOfBirth: patient.dateOfBirth,
        age,
      },
      assessmentCounts,
      latestAssessments,
      alerts,
      trends,
    };
  }

  /**
   * Get cross-assessment correlations
   */
  async getCrossAssessmentCorrelations(
    patientId: string
  ): Promise<CrossAssessmentCorrelation> {
    const assessments = await prisma.assessment.findMany({
      where: { patientId },
      include: {
        gdsDetails: true,
        npiDetails: true,
        faqDetails: true,
        cdrDetails: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build dated series for each assessment type
    type Point = { date: Date; score: number };
    const gdsSeries: Point[] = assessments
      .filter((a) => a.gdsDetails)
      .map((a) => ({ date: a.createdAt, score: a.gdsDetails!.score }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const npiSeries: Point[] = assessments
      .filter((a) => a.npiDetails)
      .map((a) => ({ date: a.createdAt, score: a.npiDetails!.totalScore }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const faqSeries: Point[] = assessments
      .filter((a) => a.faqDetails)
      .map((a) => ({ date: a.createdAt, score: a.faqDetails!.totalScore }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Use Sum of Boxes (SOB) for CDR correlation
    const cdrSeries: Point[] = assessments
      .filter((a) => a.cdrDetails)
      .map((a) => ({
        date: a.createdAt,
        score:
          a.cdrDetails!.memory +
          a.cdrDetails!.orientation +
          a.cdrDetails!.judgmentProblem +
          a.cdrDetails!.communityAffairs +
          a.cdrDetails!.homeHobbies +
          a.cdrDetails!.personalCare,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Pair by nearest dates within a window (e.g., 14 days)
    const pairNearest = (a: Point[], b: Point[], windowDays = 14): { a: number[]; b: number[] } => {
      const used = new Set<number>();
      const ax: number[] = [];
      const bx: number[] = [];
      const msWindow = windowDays * 24 * 60 * 60 * 1000;

      for (let i = 0; i < a.length; i++) {
        const t = a[i].date.getTime();
        let bestJ = -1;
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let j = 0; j < b.length; j++) {
          if (used.has(j)) continue;
          const diff = Math.abs(b[j].date.getTime() - t);
          if (diff <= msWindow && diff < bestDiff) {
            bestDiff = diff;
            bestJ = j;
          }
        }
        if (bestJ !== -1) {
          ax.push(a[i].score);
          bx.push(b[bestJ].score);
          used.add(bestJ);
        }
      }
      return { a: ax, b: bx };
    };

    const gdsNpiPairs = pairNearest(gdsSeries, npiSeries);
    const gdsFaqPairs = pairNearest(gdsSeries, faqSeries);
    const gdsCdrPairs = pairNearest(gdsSeries, cdrSeries);
    const npiFaqPairs = pairNearest(npiSeries, faqSeries);
    const npiCdrPairs = pairNearest(npiSeries, cdrSeries);
    const faqCdrPairs = pairNearest(faqSeries, cdrSeries);

    // Calculate correlations on aligned pairs
    const correlations = {
      gdsNpi: this.calculateCorrelation(gdsNpiPairs.a, gdsNpiPairs.b),
      gdsFaq: this.calculateCorrelation(gdsFaqPairs.a, gdsFaqPairs.b),
      gdsCdr: this.calculateCorrelation(gdsCdrPairs.a, gdsCdrPairs.b),
      npiFaq: this.calculateCorrelation(npiFaqPairs.a, npiFaqPairs.b),
      npiCdr: this.calculateCorrelation(npiCdrPairs.a, npiCdrPairs.b),
      faqCdr: this.calculateCorrelation(faqCdrPairs.a, faqCdrPairs.b),
    };

    // Generate insights
    const insights = this.generateCorrelationInsights(correlations);

    return {
      patientId,
      correlations,
      insights,
    };
  }

  /**
   * Get progression report over time
   */
  async getProgressionReport(
    patientId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProgressionReport> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000); // Default: last year

    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        gdsDetails: true,
        npiDetails: true,
        faqDetails: true,
        cdrDetails: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build progression arrays
    const gdsProgression = this.buildProgression(
      assessments.filter((a) => a.gdsDetails),
      (a) => a.gdsDetails!.score
    );
    const npiProgression = this.buildProgression(
      assessments.filter((a) => a.npiDetails),
      (a) => a.npiDetails!.totalScore
    );
    const faqProgression = this.buildProgression(
      assessments.filter((a) => a.faqDetails),
      (a) => a.faqDetails!.totalScore
    );
    const cdrProgression = this.buildProgression(
      assessments.filter((a) => a.cdrDetails),
      (a) => 
        a.cdrDetails!.memory +
        a.cdrDetails!.orientation +
        a.cdrDetails!.judgmentProblem +
        a.cdrDetails!.communityAffairs +
        a.cdrDetails!.homeHobbies +
        a.cdrDetails!.personalCare
    );

    // Identify milestones
    const milestones = this.identifyMilestones(assessments);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      gdsProgression,
      npiProgression,
      faqProgression,
      cdrProgression
    );

    return {
      patientId,
      timeRange: {
        start,
        end,
        durationDays: Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      },
      gdsProgression,
      npiProgression,
      faqProgression,
      cdrProgression,
      milestones,
      recommendations,
    };
  }

  // Helper methods

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  private getGDSSeverity(score: number): string {
    if (score <= 4) return 'Normal';
    if (score <= 9) return 'Mild Depression';
    return 'Severe Depression';
  }

  private getNPISeverity(score: number): string {
    if (score === 0) return 'None';
    if (score <= 12) return 'Mild';
    if (score <= 24) return 'Moderate';
    if (score <= 36) return 'Moderately Severe';
    return 'Severe';
  }

  private getFAQSeverity(score: number): string {
    if (score === 0) return 'No Impairment';
    if (score <= 5) return 'Mild';
    if (score <= 15) return 'Moderate';
    if (score <= 25) return 'Severe';
    return 'Very Severe';
  }

  private getCDRSeverity(globalCDR: number): string {
    const labels: Record<number, string> = {
      0: 'None',
      0.5: 'Questionable',
      1: 'Mild',
      2: 'Moderate',
      3: 'Severe',
    };
    return labels[globalCDR] || 'Unknown';
  }

  private generateAlerts(latestAssessments: any): Alert[] {
    const alerts: Alert[] = [];

    // GDS alerts
    if (latestAssessments.gds && latestAssessments.gds.score >= 10) {
      alerts.push({
        type: 'danger',
        category: 'Depression',
        message: 'Severe depression detected. Immediate psychiatric evaluation recommended.',
        priority: 1,
      });
    } else if (latestAssessments.gds && latestAssessments.gds.score >= 5) {
      alerts.push({
        type: 'warning',
        category: 'Depression',
        message: 'Mild to moderate depression detected. Consider treatment options.',
        priority: 2,
      });
    }

    // NPI alerts
    if (latestAssessments.npi && latestAssessments.npi.score >= 37) {
      alerts.push({
        type: 'danger',
        category: 'Behavioral',
        message: 'Severe behavioral symptoms. Caregiver support and intervention needed.',
        priority: 1,
      });
    }

    // FAQ alerts
    if (latestAssessments.faq && latestAssessments.faq.score >= 9) {
      alerts.push({
        type: 'warning',
        category: 'Functional',
        message: 'Significant functional impairment. Safety assessment recommended.',
        priority: 2,
      });
    }

    // CDR alerts
    if (latestAssessments.cdr) {
      const globalCDR = parseFloat(latestAssessments.cdr.score.split(' ')[0]);
      if (globalCDR >= 2) {
        alerts.push({
          type: 'danger',
          category: 'Cognition',
          message: 'Moderate to severe dementia. Full-time care planning needed.',
          priority: 1,
        });
      } else if (globalCDR >= 1) {
        alerts.push({
          type: 'warning',
          category: 'Cognition',
          message: 'Mild dementia detected. Care planning and support services recommended.',
          priority: 2,
        });
      }
    }

    return alerts.sort((a, b) => a.priority - b.priority);
  }

  private async calculateTrends(patientId: string, assessments: any[]): Promise<TrendSummary> {
    const gdsTrend = this.calculateAssessmentTrend(
      assessments.filter((a) => a.gdsDetails),
      (a) => a.gdsDetails.score
    );
    const npiTrend = this.calculateAssessmentTrend(
      assessments.filter((a) => a.npiDetails),
      (a) => a.npiDetails.totalScore
    );
    const faqTrend = this.calculateAssessmentTrend(
      assessments.filter((a) => a.faqDetails),
      (a) => a.faqDetails.totalScore
    );
    const cdrTrend = this.calculateAssessmentTrend(
      assessments.filter((a) => a.cdrDetails),
      (a) => 
        a.cdrDetails.memory +
        a.cdrDetails.orientation +
        a.cdrDetails.judgmentProblem +
        a.cdrDetails.communityAffairs +
        a.cdrDetails.homeHobbies +
        a.cdrDetails.personalCare
    );

    // Determine overall trend
    const worsening = [gdsTrend, npiTrend, faqTrend, cdrTrend].filter(
      (t) => t.direction === 'worsening'
    ).length;
    const rapidWorsening = [gdsTrend, npiTrend, faqTrend, cdrTrend].filter(
      (t) => t.direction === 'worsening' && t.significance === 'severe'
    ).length;

    let overallTrend: 'improving' | 'stable' | 'declining' | 'rapidly_declining';
    if (rapidWorsening >= 2) {
      overallTrend = 'rapidly_declining';
    } else if (worsening >= 3) {
      overallTrend = 'declining';
    } else if (worsening >= 1) {
      overallTrend = 'stable';
    } else {
      overallTrend = 'improving';
    }

    const notes: string[] = [];
    if (overallTrend === 'rapidly_declining') {
      notes.push('Rapid decline detected across multiple domains. Immediate clinical review recommended.');
    }
    if (gdsTrend.significance === 'severe') {
      notes.push('Significant worsening in depression symptoms.');
    }
    if (cdrTrend.direction === 'worsening') {
      notes.push('Cognitive decline progressing.');
    }

    return {
      overallTrend,
      gds: gdsTrend,
      npi: npiTrend,
      faq: faqTrend,
      cdr: cdrTrend,
      notes,
    };
  }

  private calculateAssessmentTrend(assessments: any[], scoreExtractor: (a: any) => number): TrendDirection {
    if (assessments.length < 2) {
      return { direction: 'stable', changeRate: 0, significance: 'none' };
    }

    const recent = assessments.slice(0, Math.min(3, assessments.length));
    const scores = recent.map(scoreExtractor);
    const changeRate = (scores[0] - scores[scores.length - 1]) / scores.length;

    let direction: 'improving' | 'stable' | 'worsening';
    if (changeRate > 0.5) direction = 'worsening';
    else if (changeRate < -0.5) direction = 'improving';
    else direction = 'stable';

    let significance: 'none' | 'mild' | 'moderate' | 'severe';
    const absChange = Math.abs(changeRate);
    if (absChange >= 3) significance = 'severe';
    else if (absChange >= 2) significance = 'moderate';
    else if (absChange >= 1) significance = 'mild';
    else significance = 'none';

    return { direction, changeRate, significance };
  }

  private calculateCorrelation(arr1: number[], arr2: number[]): CorrelationData {
    if (arr1.length === 0 || arr2.length === 0 || arr1.length !== arr2.length) {
      return { correlation: 0, strength: 'none', pValue: 1, sampleSize: 0 };
    }

    const n = arr1.length;
    const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const correlation =
      denominator1 === 0 || denominator2 === 0
        ? 0
        : numerator / Math.sqrt(denominator1 * denominator2);

    let strength: 'none' | 'weak' | 'moderate' | 'strong';
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) strength = 'strong';
    else if (absCorr >= 0.4) strength = 'moderate';
    else if (absCorr >= 0.2) strength = 'weak';
    else strength = 'none';

    return { correlation, strength, pValue: 0.05, sampleSize: n };
  }

  private generateCorrelationInsights(correlations: any): string[] {
    const insights: string[] = [];

    if (correlations.gdsNpi.strength === 'strong' || correlations.gdsNpi.strength === 'moderate') {
      insights.push(
        'Strong correlation between depression and behavioral symptoms suggests mood-driven behaviors.'
      );
    }

    if (correlations.faqCdr.strength === 'strong') {
      insights.push(
        'Strong correlation between functional impairment and dementia severity, as expected.'
      );
    }

    if (correlations.gdsFaq.correlation > 0.5) {
      insights.push(
        'Depression may be contributing to functional decline. Consider treating depression.'
      );
    }

    return insights;
  }

  private buildProgression(assessments: any[], scoreExtractor: (a: any) => number): AssessmentProgression[] {
    const progression: AssessmentProgression[] = [];
    let previousScore: number | null = null;

    for (const assessment of assessments) {
      const score = scoreExtractor(assessment);
      const change = previousScore !== null ? score - previousScore : 0;
      const percentChange = previousScore !== null && previousScore !== 0 
        ? ((score - previousScore) / previousScore) * 100 
        : 0;

      progression.push({
        date: assessment.createdAt,
        score,
        change,
        percentChange,
      });

      previousScore = score;
    }

    return progression;
  }

  private identifyMilestones(assessments: any[]): Milestone[] {
    const milestones: Milestone[] = [];

    // Check for CDR progression
    const cdrAssessments = assessments.filter((a) => a.cdrDetails);
    for (let i = 1; i < cdrAssessments.length; i++) {
      const prev = cdrAssessments[i - 1].cdrDetails.globalScore;
      const curr = cdrAssessments[i].cdrDetails.globalScore;
      
      if (curr > prev) {
        milestones.push({
          date: cdrAssessments[i].createdAt,
          event: `CDR progression from ${prev} to ${curr}`,
          significance: curr >= 2 ? 'high' : 'medium',
          description: `Dementia stage progressed from ${this.getCDRSeverity(prev)} to ${this.getCDRSeverity(curr)}`,
        });
      }
    }

    return milestones;
  }

  private generateRecommendations(
    gds: AssessmentProgression[],
    npi: AssessmentProgression[],
    faq: AssessmentProgression[],
    cdr: AssessmentProgression[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for worsening trends
    if (gds.length >= 2 && gds[gds.length - 1].change > 3) {
      recommendations.push('Depression symptoms worsening. Consider psychiatric consultation.');
    }

    if (npi.length >= 2 && npi[npi.length - 1].change > 10) {
      recommendations.push('Behavioral symptoms increasing. Caregiver support and possible medication review needed.');
    }

    if (faq.length >= 2 && faq[faq.length - 1].change > 5) {
      recommendations.push('Functional abilities declining. Safety assessment and care planning recommended.');
    }

    if (cdr.length >= 2 && cdr[cdr.length - 1].change >= 1) {
      recommendations.push('Cognitive decline progressing. Review treatment plan and consider clinical trial enrollment.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current monitoring schedule. Patient showing stable progression.');
    }

    return recommendations;
  }
}

export const analyticsService = new AnalyticsService();
