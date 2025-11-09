import { z } from 'zod';

/**
 * Validation schemas for patient operations
 */

// Gender enum
export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);

// Caregiver relationship enum
export const caregiverRelationshipSchema = z.enum([
  'SPOUSE',
  'CHILD',
  'SIBLING',
  'PARENT',
  'FRIEND',
  'PROFESSIONAL',
  'OTHER',
]);

// Create patient schema
export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    return !isNaN(dob.getTime()) && age >= 0 && age <= 150;
  }, 'Invalid date of birth'),
  gender: genderSchema,
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  medicalRecordNumber: z.string().max(50).optional().nullable(),
  caregiverName: z.string().max(200).optional().nullable(),
  caregiverRelationship: caregiverRelationshipSchema.optional().nullable(),
  caregiverPhone: z.string().min(10).optional().nullable(),
  caregiverEmail: z.string().email().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// Update patient schema (all fields optional except ID)
export const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    return !isNaN(dob.getTime()) && age >= 0 && age <= 150;
  }, 'Invalid date of birth').optional(),
  gender: genderSchema.optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  medicalRecordNumber: z.string().max(50).optional().nullable(),
  caregiverName: z.string().max(200).optional().nullable(),
  caregiverRelationship: caregiverRelationshipSchema.optional().nullable(),
  caregiverPhone: z.string().min(10).optional().nullable(),
  caregiverEmail: z.string().email().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// Query/filter schema for patient list
export const patientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  gender: genderSchema.optional(),
  sortBy: z.enum(['firstName', 'lastName', 'dateOfBirth', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQuery = z.infer<typeof patientQuerySchema>;
export type Gender = z.infer<typeof genderSchema>;
export type CaregiverRelationship = z.infer<typeof caregiverRelationshipSchema>;
