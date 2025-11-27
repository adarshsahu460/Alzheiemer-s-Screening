import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { cdrService } from './cdr.service';
import { createCDRAssessmentSchema } from '@alzheimer/types';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireRole } from '../../../middleware/rbac';

/**
 * CDR Assessment Routes
 * 
 * Endpoints:
 * - POST /api/assessments/cdr - Create new CDR assessment
 * - GET /api/assessments/cdr/:id - Get CDR assessment by ID
 * - GET /api/assessments/cdr/patient/:patientId - Get patient's CDR assessments
 * - GET /api/assessments/cdr/patient/:patientId/stats - Get patient CDR statistics
 * - GET /api/assessments/cdr/patient/:patientId/distribution - Get CDR score distribution
 * - GET /api/assessments/cdr/compare/:id1/:id2 - Compare two CDR assessments
 * - DELETE /api/assessments/cdr/:id - Delete CDR assessment
 */

// Request schemas
const idParamSchema = z.object({
  id: z.string().cuid(),
});

const patientIdParamSchema = z.object({
  patientId: z.string().cuid(),
});

const compareParamsSchema = z.object({
  id1: z.string().cuid(),
  id2: z.string().cuid(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export async function cdrRoutes(fastify: FastifyInstance) {
  // Apply authentication to all CDR routes
  fastify.addHook('onRequest', authenticate);
  /**
   * Create a new CDR assessment
   */
  fastify.post(
    '/',
    { preHandler: requireRole(['CLINICIAN', 'ADMIN']) },
    async (
      request: FastifyRequest<{
        Body: {
          patientId: string;
          domainScores: number[];
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body
        const validatedData = createCDRAssessmentSchema.parse(request.body);

        // Get user ID from authenticated session
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Create assessment
        const assessment = await cdrService.createAssessment({
          ...validatedData,
          userId,
        });

        return reply.code(201).send(assessment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation error',
            details: error.errors,
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to create CDR assessment',
        });
      }
    }
  );

  /**
   * Get a CDR assessment by ID
   */
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = idParamSchema.parse(request.params);

        const assessment = await cdrService.getAssessmentById(id);

        return reply.send(assessment);
      } catch (error) {
        if (error instanceof Error && error.message === 'CDR assessment not found') {
          return reply.code(404).send({ error: 'Assessment not found' });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to fetch CDR assessment',
        });
      }
    }
  );

  /**
   * Get all CDR assessments for a patient
   */
  fastify.get(
    '/patient/:patientId',
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);
        const pagination = paginationQuerySchema.parse(request.query);

        const result = await cdrService.getPatientAssessments(
          patientId,
          pagination
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to fetch patient CDR assessments',
        });
      }
    }
  );

  /**
   * Get CDR statistics for a patient
   */
  fastify.get(
    '/patient/:patientId/stats',
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);

        const stats = await cdrService.getPatientStats(patientId);

        return reply.send(stats);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to fetch patient CDR statistics',
        });
      }
    }
  );

  /**
   * Get CDR score distribution for a patient
   */
  fastify.get(
    '/patient/:patientId/distribution',
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);

        const distribution = await cdrService.getCDRDistribution(patientId);

        return reply.send(distribution);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to fetch CDR distribution',
        });
      }
    }
  );

  /**
   * Compare two CDR assessments
   */
  fastify.get(
    '/compare/:id1/:id2',
    async (
      request: FastifyRequest<{
        Params: { id1: string; id2: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id1, id2 } = compareParamsSchema.parse(request.params);

        const comparison = await cdrService.compareAssessments(id1, id2);

        return reply.send(comparison);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Cannot compare assessments from different patients'
        ) {
          return reply.code(400).send({ error: error.message });
        }

        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({ error: 'Assessment not found' });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to compare CDR assessments',
        });
      }
    }
  );

  /**
   * Delete a CDR assessment
   */
  fastify.delete(
    '/:id',
    { preHandler: requireRole(['CLINICIAN', 'ADMIN']) },
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = idParamSchema.parse(request.params);

        // Check if user has permission to delete (admin or owner)
        const userRole = request.user?.role;
        if (userRole !== 'ADMIN' && userRole !== 'CLINICIAN') {
          return reply.code(403).send({
            error: 'Insufficient permissions to delete assessment',
          });
        }

        await cdrService.deleteAssessment(id);

        return reply.code(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to delete CDR assessment',
        });
      }
    }
  );
}
