import { PrismaClient, Patient, Prisma } from '@repo/db';
import type { CreatePatientInput, UpdatePatientInput, PatientQuery } from '@repo/types';

const prisma = new PrismaClient();

export class PatientService {
  /**
   * Create a new patient
   */
  async createPatient(
    data: CreatePatientInput,
    caregiverId: string
  ): Promise<Patient> {
    // Map medicalRecordNumber to medicalRecordNo for schema compatibility
    const { medicalRecordNumber, ...restData } = data as any;
    
    const patient = await prisma.patient.create({
      data: {
        ...restData,
        medicalRecordNo: medicalRecordNumber,
        dateOfBirth: new Date(data.dateOfBirth),
        caregiverId,
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId: caregiverId,
      action: 'CREATE',
      entityType: 'PATIENT',
      entityId: patient.id,
      details: { patientName: `${patient.firstName} ${patient.lastName}` },
    });

    return patient;
  }

  /**
   * Get patient by ID
   */
  async getPatientById(id: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        caregiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assessments: {
          select: {
            id: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Last 10 assessments
        },
      },
    });
  }

  /**
   * Get paginated list of patients with search and filters
   */
  async getPatients(query: PatientQuery) {
    const { page, limit, search, gender, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PatientWhereInput = {
      ...(gender && { gender }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { medicalRecordNo: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Execute query with count
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          caregiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              assessments: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update patient
   */
  async updatePatient(
    id: string,
    data: UpdatePatientInput,
    updatedById: string
  ): Promise<Patient> {
    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      throw new Error('Patient not found');
    }

    // Map medicalRecordNumber to medicalRecordNo for schema compatibility
    const { medicalRecordNumber, ...restData } = data as any;

    const updateData: any = { ...restData };
    
    // Add mapped field if it exists
    if (medicalRecordNumber !== undefined) {
      updateData.medicalRecordNo = medicalRecordNumber;
    }
    
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await this.createAuditLog({
      userId: updatedById,
      action: 'UPDATE',
      entityType: 'PATIENT',
      entityId: patient.id,
      details: {
        patientName: `${patient.firstName} ${patient.lastName}`,
        changes: data,
      },
    });

    return patient;
  }

  /**
   * Delete patient (soft delete by setting deleted flag if needed, or hard delete)
   */
  async deletePatient(id: string, deletedById: string): Promise<void> {
    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assessments: true,
          },
        },
      },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Create audit log before deletion
    await this.createAuditLog({
      userId: deletedById,
      action: 'DELETE',
      entityType: 'PATIENT',
      entityId: patient.id,
      details: {
        patientName: `${patient.firstName} ${patient.lastName}`,
        assessmentCount: patient._count.assessments,
      },
    });

    // Delete patient (this will cascade delete assessments)
    await prisma.patient.delete({
      where: { id },
    });
  }

  /**
   * Search patients by name or MRN (for autocomplete)
   */
  async searchPatients(searchTerm: string, limit: number = 10) {
    return prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { medicalRecordNo: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        medicalRecordNo: true,
      },
      take: limit,
      orderBy: {
        lastName: 'asc',
      },
    });
  }

  /**
   * Get patient statistics for dashboard
   */
  async getPatientStats(userId?: string) {
    const where = userId ? { caregiverId: userId } : {};

    const [total, recentCount, genderDistribution] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      prisma.patient.groupBy({
        by: ['gender'],
        where,
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      total,
      recentCount,
      genderDistribution: genderDistribution.map((g) => ({
        gender: g.gender,
        count: g._count.id,
      })),
    };
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
      // Log error but don't fail the main operation
      console.error('Failed to create audit log:', error);
    }
  }
}

export const patientService = new PatientService();
