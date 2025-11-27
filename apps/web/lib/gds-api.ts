import { apiClient } from './api-client';
import type { GDSAnswers } from '@repo/types';

export interface GDSAssessment {
  id: string;
  type: 'GDS';
  patientId: string;
  assessedById: string;
  answers: GDSAnswers;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    medicalRecordNo?: string | null;
  };
  assessedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  gdsDetails?: {
    id: string;
    assessmentId: string;
    score: number;
    severity: 'NORMAL' | 'MILD' | 'MODERATE' | 'SEVERE';
  };
  questionBreakdown?: QuestionBreakdown[];
}

export interface QuestionBreakdown {
  number: number;
  question: string;
  answer: string;
  reverseScored: boolean;
  contributesToScore: boolean;
}

export interface GDSStats {
  total: number;
  averageScore: number;
  latestScore: number | null;
  latestSeverity: string | null;
  scoreHistory: {
    date: Date;
    score: number;
    severity: string;
  }[];
}

export interface ComparisonResult {
  assessment1: {
    id: string;
    date: Date;
    score: number;
    severity?: string;
  };
  assessment2: {
    id: string;
    date: Date;
    score: number;
    severity?: string;
  };
  scoreDifference: number;
  improvement: boolean;
  percentChange: number;
}

/**
 * Create new GDS assessment
 */
export async function createGDSAssessment(data: {
  patientId: string;
  answers: boolean[];
  notes?: string;
}) {
  const response = await apiClient.post<{
    success: boolean;
    data: GDSAssessment;
    message: string;
  }>('/api/assessments/gds', data);
  return response.data;
}

/**
 * Get single GDS assessment by ID
 */
export async function getGDSAssessment(id: string) {
  const response = await apiClient.get<{
    success: boolean;
    data: GDSAssessment;
  }>(`/api/assessments/gds/${id}`);
  return response.data.data;
}

/**
 * Get all GDS assessments for a patient
 */
export async function getPatientGDSAssessments(
  patientId: string,
  options?: GetAssessmentsOptions
) {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      assessments: GDSAssessment[];
      total: number;
    };
  }>(`/api/assessments/gds/patient/${patientId}`, {
    params: options,
  });
  return response.data.data;
}

/**
 * Get GDS statistics for a patient
 */
export async function getPatientGDSStats(patientId: string) {
  const response = await apiClient.get<{
    success: boolean;
    data: GDSStats;
  }>(`/api/assessments/gds/patient/${patientId}/stats`);
  return response.data.data;
}

/**
 * Compare two GDS assessments
 */
export async function compareGDSAssessments(id1: string, id2: string) {
  const response = await apiClient.get<{
    success: boolean;
    data: any;
  }>(`/api/assessments/gds/compare/${id1}/${id2}`);
  return response.data.data;
}

/**
 * Delete GDS assessment
 */
export async function deleteGDSAssessment(id: string) {
  const response = await apiClient.delete<{
    success: boolean;
    data: null;
  }>(`/api/assessments/gds/${id}`);
  return response.data;
}
