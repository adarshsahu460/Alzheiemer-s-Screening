import { apiClient } from './api-client';
import type { FAQAnswers } from '@repo/types';

// Types
export interface ItemBreakdown {
  item: string;
  itemNumber: number;
  description: string;
  score: number;
  scoreLabel: string;
}

export interface FAQAssessmentData {
  assessmentId: string;
  totalScore: number;
  item1Score: number;
  item2Score: number;
  item3Score: number;
  item4Score: number;
  item5Score: number;
  item6Score: number;
  item7Score: number;
  item8Score: number;
  item9Score: number;
  item10Score: number;
}

export interface FAQAssessment {
  id: string;
  type: 'FAQ';
  patientId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    medicalRecordNo: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  faqDetails: FAQAssessmentData;
  itemBreakdown?: ItemBreakdown[];
}

export interface ItemStats {
  item: string;
  itemNumber: number;
  averageScore: number;
  impairmentRate: number;
}

export interface FAQStats {
  total: number;
  averageScore: number;
  latestScore: number | null;
  latestImpairment: string | null;
  scoreHistory: Array<{
    date: string;
    totalScore: number;
    impairment: string;
  }>;
  itemStats: ItemStats[];
}

export interface ComparisonResult {
  assessment1: {
    id: string;
    date: string;
    totalScore: number;
    impairment: string;
  };
  assessment2: {
    id: string;
    date: string;
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

export interface CreateFAQAssessmentInput {
  patientId: string;
  answers: FAQAnswers;
  notes?: string;
}

export interface GetPatientAssessmentsOptions {
  limit?: number;
  skip?: number;
  sortOrder?: 'asc' | 'desc';
}

// API functions
export async function createFAQAssessment(data: CreateFAQAssessmentInput): Promise<FAQAssessment> {
  const response = await apiClient.post<{ data: FAQAssessment }>('/api/assessments/faq', data);
  return response.data.data;
}

export async function getFAQAssessment(id: string): Promise<FAQAssessment> {
  const response = await apiClient.get<{ data: FAQAssessment }>(`/api/assessments/faq/${id}`);
  return response.data.data;
}

export async function getPatientFAQAssessments(
  patientId: string,
  options?: GetPatientAssessmentsOptions
): Promise<{
  assessments: FAQAssessment[];
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
    data: FAQAssessment[];
    pagination: {
      total: number;
      limit: number;
      skip: number;
      hasMore: boolean;
    };
  }>(`/api/assessments/faq/patient/${patientId}?${params.toString()}`);

  return {
    assessments: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getPatientFAQStats(patientId: string): Promise<FAQStats> {
  const response = await apiClient.get<{ data: FAQStats }>(
    `/api/assessments/faq/patient/${patientId}/stats`
  );
  return response.data.data;
}

export async function compareFAQAssessments(id1: string, id2: string): Promise<ComparisonResult> {
  const response = await apiClient.get<{ data: ComparisonResult }>(
    `/api/assessments/faq/compare/${id1}/${id2}`
  );
  return response.data.data;
}

export async function deleteFAQAssessment(id: string): Promise<void> {
  await apiClient.delete(`/api/assessments/faq/${id}`);
}
