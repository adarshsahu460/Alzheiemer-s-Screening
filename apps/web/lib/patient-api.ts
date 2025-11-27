import { apiClient } from './api-client';
import type { CreatePatientInput, UpdatePatientInput, PatientQuery } from '@repo/types';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  medicalRecordNo?: string | null;
  caregiverName?: string | null;
  caregiverRelationship?: string | null;
  caregiverPhone?: string | null;
  caregiverEmail?: string | null;
  notes?: string | null;
  caregiverId: string;
  createdAt: Date;
  updatedAt: Date;
  caregiver?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  _count?: {
    assessments: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PatientStats {
  total: number;
  recentCount: number;
  genderDistribution: {
    gender: string;
    count: number;
  }[];
}

/**
 * Get paginated list of patients
 */
export async function getPatients(query: Partial<PatientQuery> = {}) {
  const response = await apiClient.get<PaginatedResponse<Patient>>('/api/patients', {
    params: query,
  });
  return response.data;
}

/**
 * Search patients (autocomplete)
 */
export async function searchPatients(searchTerm: string, limit: number = 10) {
  const response = await apiClient.get<{ success: boolean; data: Patient[] }>(
    '/api/patients/search',
    {
      params: { q: searchTerm, limit },
    }
  );
  return response.data.data;
}

/**
 * Get patient statistics
 */
export async function getPatientStats() {
  const response = await apiClient.get<{ success: boolean; data: PatientStats }>(
    '/api/patients/stats'
  );
  return response.data.data;
}

/**
 * Get single patient by ID
 */
export async function getPatient(id: string) {
  const response = await apiClient.get<{ success: boolean; data: Patient }>(
    `/api/patients/${id}`
  );
  return response.data.data;
}

/**
 * Create new patient
 */
export async function createPatient(data: CreatePatientInput) {
  const response = await apiClient.post<{
    success: boolean;
    data: Patient;
    message: string;
  }>('/api/patients', data);
  return response.data;
}

/**
 * Update patient
 */
export async function updatePatient(id: string, data: UpdatePatientInput) {
  const response = await apiClient.put<{
    success: boolean;
    data: Patient;
    message: string;
  }>(`/api/patients/${id}`, data);
  return response.data;
}

/**
 * Delete patient
 */
export async function deletePatient(id: string) {
  const response = await apiClient.delete<{
    success: boolean;
    message: string;
  }>(`/api/patients/${id}`);
  return response.data;
}
