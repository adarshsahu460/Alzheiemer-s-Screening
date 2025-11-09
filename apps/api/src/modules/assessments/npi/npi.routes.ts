import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { npiService } from './npi.service';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireRole } from '../../../middleware/rbac';

// Validation schemas
const createNPISchema = z.object({
  patientId: z.string().cuid(),
  domainScores: z.array(
    z.object({
      domainId: z.number(),
      frequency: z.number().min(1).max(4),
      severity: z.number().min(1).max(3),
      distress: z.number().min(0).max(5),
      score: z.number().min(0).max(12),
    })
  ).min(0).max(12), // 0-12 domains (only present ones)
  notes: z.string().max(2000).optional(),
});

const getPatientAssessmentsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  skip: z.coerce.number().min(0).optional().default(0),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const uuidParamSchema = z.object({
  id: z.string().cuid(),
});

const patientIdParamSchema = z.object({
  patientId: z.string().cuid(),
});

const compareParamsSchema = z.object({
  id1: z.string().cuid(),
  id2: z.string().cuid(),
});

export async function npiRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes
  fastify.addHook('onRequest', authenticate);

  /**
   * POST /assessments/npi
   * Create a new NPI assessment
   */
  fastify.post(
    '/',
    {
      preHandler: requireRole(['CLINICIAN', 'ADMIN']),
    },
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof createNPISchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = createNPISchema.parse(request.body);
        
        const assessment = await npiService.createAssessment({
          ...data,
          assessedById: request.user!.id,
        });

        return reply.code(201).send({
          success: true,
          data: assessment,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create NPI assessment',
        });
      }
    }
  );

  /**
   * GET /assessments/npi/:id
   * Get a single NPI assessment by ID
   */
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof uuidParamSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = uuidParamSchema.parse(request.params);
        
        const assessment = await npiService.getAssessment(id);
        const domainBreakdown = await npiService.getDomainBreakdown(id);

        return reply.send({
          success: true,
          data: {
            ...assessment,
            domainBreakdown,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'NPI assessment not found') {
          return reply.code(404).send({
            success: false,
            error: 'NPI assessment not found',
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch NPI assessment',
        });
      }
    }
  );

  /**
   * GET /assessments/npi/patient/:patientId
   * Get all NPI assessments for a patient
   */
  fastify.get(
    '/patient/:patientId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof patientIdParamSchema>;
        Querystring: z.infer<typeof getPatientAssessmentsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);
        const options = getPatientAssessmentsSchema.parse(request.query);

        const result = await npiService.getPatientAssessments(patientId, options);

        return reply.send({
          success: true,
          data: result.assessments,
          pagination: {
            total: result.total,
            limit: result.limit,
            skip: result.skip,
            hasMore: result.skip + result.limit < result.total,
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch patient NPI assessments',
        });
      }
    }
  );

  /**
   * GET /assessments/npi/patient/:patientId/stats
   * Get statistics for a patient's NPI assessments
   */
  fastify.get(
    '/patient/:patientId/stats',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof patientIdParamSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);
        
        const stats = await npiService.getPatientStats(patientId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch NPI statistics',
        });
      }
    }
  );

  /**
   * GET /assessments/npi/compare/:id1/:id2
   * Compare two NPI assessments
   */
  fastify.get(
    '/compare/:id1/:id2',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof compareParamsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id1, id2 } = compareParamsSchema.parse(request.params);
        
        const comparison = await npiService.compareAssessments(id1, id2);

        return reply.send({
          success: true,
          data: comparison,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'NPI assessment not found') {
          return reply.code(404).send({
            success: false,
            error: 'One or both NPI assessments not found',
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to compare NPI assessments',
        });
      }
    }
  );

  /**
   * DELETE /assessments/npi/:id
   * Delete an NPI assessment (Admin only)
   */
  fastify.delete(
    '/:id',
    {
      preHandler: requireRole(['ADMIN']),
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof uuidParamSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = uuidParamSchema.parse(request.params);
        
        await npiService.deleteAssessment(id, request.user!.id);

        return reply.send({
          success: true,
          message: 'NPI assessment deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'NPI assessment not found') {
          return reply.code(404).send({
            success: false,
            error: 'NPI assessment not found',
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete NPI assessment',
        });
      }
    }
  );
}
