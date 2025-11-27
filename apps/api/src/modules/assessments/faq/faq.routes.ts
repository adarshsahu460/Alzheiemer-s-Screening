import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { faqService } from './faq.service';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireRole } from '../../../middleware/rbac';

// Validation schemas
const createFAQSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  answers: z.array(z.number().min(0).max(3)).length(10), // Exactly 10 items, each 0-3
  notes: z.string().max(2000).optional(),
});

const getPatientAssessmentsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  skip: z.coerce.number().min(0).optional().default(0),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const uuidParamSchema = z.object({
  id: z.string().cuid('Invalid assessment ID'),
});

const patientIdParamSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
});

const compareParamsSchema = z.object({
  id1: z.string().uuid(),
  id2: z.string().uuid(),
});

export async function faqRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes
  fastify.addHook('onRequest', authenticate);

  /**
   * POST /assessments/faq
   * Create a new FAQ assessment
   */
  fastify.post(
    '/',
    {
      preHandler: requireRole(['CLINICIAN', 'ADMIN']),
    },
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof createFAQSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = createFAQSchema.parse(request.body);
        
        const assessment = await faqService.createAssessment({
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
          error: 'Failed to create FAQ assessment',
        });
      }
    }
  );

  /**
   * GET /assessments/faq/:id
   * Get a single FAQ assessment by ID
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
        
        const assessment = await faqService.getAssessmentById(id);
        const itemBreakdown = await faqService.getItemBreakdown(id);

        return reply.send({
          success: true,
          data: {
            ...assessment,
            itemBreakdown,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'FAQ assessment not found') {
          return reply.code(404).send({
            success: false,
            error: 'FAQ assessment not found',
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch FAQ assessment',
        });
      }
    }
  );

  /**
   * GET /assessments/faq/patient/:patientId
   * Get all FAQ assessments for a patient
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

        const result = await faqService.getPatientAssessments(patientId, options);

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
          error: 'Failed to fetch patient FAQ assessments',
        });
      }
    }
  );

  /**
   * GET /assessments/faq/patient/:patientId/stats
   * Get statistics for a patient's FAQ assessments
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
        
        const stats = await faqService.getPatientStats(patientId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch FAQ statistics',
        });
      }
    }
  );

  /**
   * GET /assessments/faq/compare/:id1/:id2
   * Compare two FAQ assessments
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
        
        const comparison = await faqService.compareAssessments(id1, id2);

        return reply.send({
          success: true,
          data: comparison,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'FAQ assessment not found') {
          return reply.code(404).send({
            success: false,
            error: 'One or both FAQ assessments not found',
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to compare FAQ assessments',
        });
      }
    }
  );

  /**
   * DELETE /assessments/faq/:id
   * Delete an FAQ assessment (Admin only)
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
        
        await faqService.deleteAssessment(id, request.user!.id);

        return reply.send({
          success: true,
          message: 'FAQ assessment deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'FAQ assessment not found') {
          return reply.code(404).send({
            success: false,
            error: 'FAQ assessment not found',
          });
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete FAQ assessment',
        });
      }
    }
  );
}
