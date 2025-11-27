import { apiClient } from './api-client';
import type { NPIDomainScore } from '@repo/types';

// Types
export interface DomainBreakdown {
  domain: string;
  domainId: number;
  isPresent: boolean;
  frequency: number | null;
  severity: number | null;
  domainScore: number;
  distress: number | null;
}

export interface NPIAssessmentData {
  assessmentId: string;
  totalScore: number;
  domainScores: Array<{
    domainId: number;
    frequency: number;
    severity: number;
    distress: number;
    score: number;
  }>;
}

export interface NPIAssessment {
  id: string;
  type: 'NPI';
  patientId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    medicalRecordNo: string | null;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  npiDetails: NPIAssessmentData;
  domainBreakdown?: DomainBreakdown[];
}

export interface DomainStats {
  domain: string;
  domainId: number;
  averageScore: number;
  averageDistress: number;
  presenceRate: number;
}

export interface NPIStats {
  total: number;
  averageScore: number;
  averageTotalDistress: number;
  latestScore: number | null;
  latestTotalDistress: number | null;
  scoreHistory: Array<{
    date: string;
    totalScore: number;
    totalDistress: number;
  }>;
  domainStats: DomainStats[];
}

export interface ComparisonResult {
  assessment1: {
    id: string;
    date: string;
    totalScore: number;
    totalDistress: number;
  };
  assessment2: {
    id: string;
    date: string;
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

export interface CreateNPIAssessmentInput {
  patientId: string;
  domainScores: NPIDomainScore[];
  notes?: string;
}

export interface GetPatientAssessmentsOptions {
  limit?: number;
  skip?: number;
  sortOrder?: 'asc' | 'desc';
}

// API functions
export async function createNPIAssessment(data: CreateNPIAssessmentInput): Promise<NPIAssessment> {
  const response = await apiClient.post<{ data: NPIAssessment }>('/api/assessments/npi', data);
  return response.data.data;
}

export async function getNPIAssessment(id: string): Promise<NPIAssessment> {
  const response = await apiClient.get<{ data: NPIAssessment }>(`/api/assessments/npi/${id}`);
  return response.data.data;
}

export async function getPatientNPIAssessments(
  patientId: string,
  options?: GetPatientAssessmentsOptions
): Promise<{
  assessments: NPIAssessment[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.skip) params.append('skip', options.skip.toString());
  if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await apiClient.get<{
    data: NPIAssessment[];
    pagination: {
      total: number;
      limit: number;
      skip: number;
      hasMore: boolean;
    };
  }>(`/api/assessments/npi/patient/${patientId}?${params.toString()}`);

  return {
    assessments: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getPatientNPIStats(patientId: string): Promise<NPIStats> {
  const response = await apiClient.get<{ data: NPIStats }>(
    `/api/assessments/npi/patient/${patientId}/stats`
  );
  return response.data.data;
}

export async function compareNPIAssessments(id1: string, id2: string): Promise<ComparisonResult> {
  const response = await apiClient.get<{ data: ComparisonResult }>(
    `/api/assessments/npi/compare/${id1}/${id2}`
  );
  return response.data.data;
}

export async function deleteNPIAssessment(id: string): Promise<void> {
  await apiClient.delete(`/api/assessments/npi/${id}`);
}
