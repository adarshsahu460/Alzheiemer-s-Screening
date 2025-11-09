import { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { patientService } from './patient.service';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type PatientQuery,
} from '@repo/types';
import { ApiError } from '../../utils/error-handler';

/**
 * Patient CRUD routes
 * Handles all patient management operations
 */
export async function patientRoutes(fastify: FastifyInstance) {
  // Get all patients (with pagination and filters)
  fastify.get(
    '/',
    { onRequest: [authenticate] },
    async (
      request: FastifyRequest<{
        Querystring: PatientQuery;
      }>,
      reply
    ) => {
      try {
        // Validate query parameters
        const query = patientQuerySchema.parse(request.query);

        const result = await patientService.getPatients(query);

        return reply.send({
          success: true,
          data: result.data,
          pagination: result.pagination,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new ApiError(400, 'Invalid query parameters', error.errors);
        }
        throw error;
      }
    }
  );

  // Search patients (autocomplete)
  fastify.get(
    '/search',
    { onRequest: [authenticate] },
    async (
      request: FastifyRequest<{
        Querystring: { q: string; limit?: number };
      }>,
      reply
    ) => {
      try {
        const { q, limit } = request.query;

        if (!q || q.trim().length === 0) {
          return reply.send({
            success: true,
            data: [],
          });
        }

        const patients = await patientService.searchPatients(
          q.trim(),
          limit ? Number(limit) : 10
        );

        return reply.send({
          success: true,
          data: patients,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Get patient statistics
  fastify.get(
    '/stats',
    { onRequest: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as any).user;

        // Clinicians see only their patients, admins see all
        const userId = user.role === 'ADMIN' ? undefined : user.id;

        const stats = await patientService.getPatientStats(userId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Get patient by ID
  fastify.get(
    '/:id',
    { onRequest: [authenticate] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply
    ) => {
      try {
        const { id } = request.params;

        const patient = await patientService.getPatientById(id);

        if (!patient) {
          throw new ApiError(404, 'Patient not found');
        }

        return reply.send({
          success: true,
          data: patient,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Create patient
  fastify.post(
    '/',
    { onRequest: [authenticate, requireRole(['CLINICIAN', 'ADMIN'])] },
    async (
      request: FastifyRequest<{
        Body: CreatePatientInput;
      }>,
      reply
    ) => {
      try {
        const user = (request as any).user;

        // Validate request body
        const validatedData = createPatientSchema.parse(request.body);

        const patient = await patientService.createPatient(
          validatedData,
          user.id
        );

        return reply.code(201).send({
          success: true,
          data: patient,
          message: 'Patient created successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new ApiError(400, 'Validation failed', error.errors);
        }
        throw error;
      }
    }
  );

  // Update patient
  fastify.put(
    '/:id',
    { onRequest: [authenticate, requireRole(['CLINICIAN', 'ADMIN'])] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdatePatientInput;
      }>,
      reply
    ) => {
      try {
        const user = (request as any).user;
        const { id } = request.params;

        // Validate request body
        const validatedData = updatePatientSchema.parse(request.body);

        const patient = await patientService.updatePatient(
          id,
          validatedData,
          user.id
        );

        return reply.send({
          success: true,
          data: patient,
          message: 'Patient updated successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new ApiError(400, 'Validation failed', error.errors);
        }
        if (error.message === 'Patient not found') {
          throw new ApiError(404, 'Patient not found');
        }
        throw error;
      }
    }
  );

  // Delete patient
  fastify.delete(
    '/:id',
    { onRequest: [authenticate, requireRole(['ADMIN'])] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply
    ) => {
      try {
        const user = (request as any).user;
        const { id } = request.params;

        await patientService.deletePatient(id, user.id);

        return reply.send({
          success: true,
          message: 'Patient deleted successfully',
        });
      } catch (error: any) {
        if (error.message === 'Patient not found') {
          throw new ApiError(404, 'Patient not found');
        }
        throw error;
      }
    }
  );
}