/**
 * Common types used across the application
 */

export type UserRole = 'ADMIN' | 'CLINICIAN' | 'CAREGIVER' | 'PATIENT';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export type AssessmentType = 'GDS' | 'NPI' | 'FAQ' | 'CDR';

export type AssessmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';

/**
 * User authentication types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Patient types
 */
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  medicalRecordNo?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  diagnosisDate?: Date;
  notes?: string;
  caregiverId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  medicalRecordNo?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  diagnosisDate?: Date;
  notes?: string;
}

/**
 * Assessment base types
 */
export interface Assessment {
  id: string;
  type: AssessmentType;
  status: AssessmentStatus;
  patientId: string;
  createdById: string;
  answers: Record<string, any>;
  totalScore?: number;
  interpretation?: string;
  assessmentDate: Date;
  completedAt?: Date;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
