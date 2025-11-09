import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// CDR domain scores type
export interface CDRDomainScores {
  memory: number;
  orientation: number;
  judgmentProblemSolving: number;
  communityAffairs: number;
  homeHobbies: number;
  personalCare: number;
}

// CDR Assessment interfaces
export interface CDRAssessment {
  id: string;
  assessmentId: string;
  memory: number;
  orientation: number;
  judgmentProblemSolving: number;
  communityAffairs: number;
  homeHobbies: number;
  personalCare: number;
  globalCDR: number;
  sumOfBoxes: number;
  notes?: string;
}

export interface CDRAssessmentWithRelations {
  id: string;
  patientId: string;
  type: string;
  createdAt: string;
  cdrDetails: CDRAssessment;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNo: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface DomainScore {
  domain: string;
  score: number;
  label: string;
}

export interface CDRStats {
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

export interface CDRDistribution {
  '0': number;
  '0.5': number;
  '1': number;
  '2': number;
  '3': number;
}

export interface ComparisonResult {
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

export interface PaginatedCDRAssessments {
  assessments: CDRAssessmentWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Create a new CDR assessment
 */
export async function createCDRAssessment(data: {
  patientId: string;
  domainScores: number[]; // Array of 6 scores (0, 0.5, 1, 2, or 3)
  notes?: string;
}): Promise<CDRAssessmentWithRelations> {
  const response = await axios.post(`${API_URL}/api/assessments/cdr`, data, {
    withCredentials: true,
  });
  return response.data;
}

/**
 * Get a CDR assessment by ID
 */
export async function getCDRAssessment(
  assessmentId: string
): Promise<CDRAssessmentWithRelations> {
  const response = await axios.get(
    `${API_URL}/api/assessments/cdr/${assessmentId}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Get all CDR assessments for a patient
 */
export async function getPatientCDRAssessments(
  patientId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedCDRAssessments> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await axios.get(
    `${API_URL}/api/assessments/cdr/patient/${patientId}?${params.toString()}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Get CDR statistics for a patient
 */
export async function getPatientCDRStats(
  patientId: string
): Promise<CDRStats> {
  const response = await axios.get(
    `${API_URL}/api/assessments/cdr/patient/${patientId}/stats`,
    {
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Get CDR score distribution for a patient
 */
export async function getPatientCDRDistribution(
  patientId: string
): Promise<CDRDistribution> {
  const response = await axios.get(
    `${API_URL}/api/assessments/cdr/patient/${patientId}/distribution`,
    {
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Compare two CDR assessments
 */
export async function compareCDRAssessments(
  assessmentId1: string,
  assessmentId2: string
): Promise<ComparisonResult> {
  const response = await axios.get(
    `${API_URL}/api/assessments/cdr/compare/${assessmentId1}/${assessmentId2}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Delete a CDR assessment
 */
export async function deleteCDRAssessment(
  assessmentId: string
): Promise<void> {
  await axios.delete(`${API_URL}/api/assessments/cdr/${assessmentId}`, {
    withCredentials: true,
  });
}

/**
 * Get CDR stage label from global CDR score
 */
export function getCDRStageLabel(globalCDR: number): string {
  const labels: Record<number, string> = {
    0: 'None',
    0.5: 'Questionable',
    1: 'Mild',
    2: 'Moderate',
    3: 'Severe',
  };
  return labels[globalCDR] || 'Unknown';
}

/**
 * Get CDR domain names
 */
export function getCDRDomainNames(): string[] {
  return [
    'Memory',
    'Orientation',
    'Judgment & Problem Solving',
    'Community Affairs',
    'Home & Hobbies',
    'Personal Care',
  ];
}

/**
 * Get color class for CDR score badge
 */
export function getCDRScoreColor(score: number): string {
  if (score === 0) return 'bg-gray-100 text-gray-800';
  if (score === 0.5) return 'bg-yellow-100 text-yellow-800';
  if (score === 1) return 'bg-orange-100 text-orange-800';
  if (score === 2) return 'bg-red-100 text-red-800';
  if (score === 3) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}

/**
 * Get color class for global CDR badge
 */
export function getGlobalCDRColor(globalCDR: number): string {
  if (globalCDR === 0) return 'bg-green-100 text-green-800';
  if (globalCDR === 0.5) return 'bg-yellow-100 text-yellow-800';
  if (globalCDR === 1) return 'bg-orange-100 text-orange-800';
  if (globalCDR === 2) return 'bg-red-100 text-red-800';
  if (globalCDR === 3) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}
