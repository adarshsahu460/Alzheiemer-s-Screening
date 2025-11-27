import { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate, requireRole } from '../../../middleware/auth.middleware';
import { gdsService } from './gds.service';
import { ApiError } from '../../../utils/error-handler';
import { z } from 'zod';
import type { GDSAnswers } from '@alzheimer/types';

// Validation schemas
const createGDSSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  answers: z.array(z.boolean()).length(15, 'GDS requires exactly 15 answers'),
  notes: z.string().max(2000).optional().nullable(),
});

const getPatientAssessmentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  skip: z.coerce.number().int().min(0).default(0),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function gdsRoutes(fastify: FastifyInstance) {
  // Create GDS assessment
  fastify.post(
    '/',
    { onRequest: [authenticate, requireRole(['CLINICIAN', 'ADMIN'])] },
    async (
      request: FastifyRequest<{
        Body: {
          patientId: string;
          answers: boolean[];
          notes?: string;
        };
      }>,
      reply
    ) => {
      try {
        const user = (request as any).user;

        // Log request body for debugging
        console.log('GDS Assessment Request Body:', JSON.stringify(request.body, null, 2));

        // Validate request body
        const validatedData = createGDSSchema.parse(request.body);

        console.log('Validation passed, creating assessment...');

        // Transform boolean array to GDSAnswers format
        const gdsAnswers: GDSAnswers = {
          answers: validatedData.answers.map((answer, index) => ({
            questionId: index + 1,
            answer: answer,
          })),
        };

        // Create assessment
        const assessment = await gdsService.createAssessment({
          patientId: validatedData.patientId,
          answers: gdsAnswers,
          assessedById: user.id,
          notes: validatedData.notes || undefined,
        });

        return reply.code(201).send({
          success: true,
          data: assessment,
          message: 'GDS assessment created successfully',
        });
      } catch (error: any) {
        console.error('Error creating GDS assessment:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error constructor:', error.constructor.name);

        if (error.constructor.name === 'ZodError' || error.name === 'ZodError') {
          console.error('Zod Validation Error:', JSON.stringify(error.errors, null, 2));
          throw new ApiError(400, `Validation failed: ${JSON.stringify(error.errors)}`, error.errors);
        }
        if (error.message?.includes('Invalid GDS answers')) {
          throw new ApiError(400, error.message);
        }
        throw error;
      }
    }
  );

  // Get single GDS assessment by ID
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

        const assessment = await gdsService.getAssessmentById(id);

        // Get question breakdown
        const breakdown = gdsService.getQuestionBreakdown(
          assessment.answers as GDSAnswers
        );

        return reply.send({
          success: true,
          data: {
            ...assessment,
            questionBreakdown: breakdown,
          },
        });
      } catch (error: any) {
        if (error.message === 'GDS assessment not found') {
          throw new ApiError(404, 'GDS assessment not found');
        }
        throw error;
      }
    }
  );

  // Get all GDS assessments for a patient
  fastify.get(
    '/patient/:patientId',
    { onRequest: [authenticate] },
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
        Querystring: {
          limit?: number;
          skip?: number;
          sortOrder?: 'asc' | 'desc';
        };
      }>,
      reply
    ) => {
      try {
        const { patientId } = request.params;

        // Validate query params
        const query = getPatientAssessmentsSchema.parse(request.query);

        const result = await gdsService.getPatientAssessments(patientId, {
          limit: query.limit,
          skip: query.skip,
          sortOrder: query.sortOrder,
        });

        return reply.send({
          success: true,
          data: {
            assessments: result.data,
            total: result.total,
          },
          hasMore: result.hasMore,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new ApiError(400, 'Invalid query parameters', error.errors);
        }
        throw error;
      }
    }
  );

  // Get GDS statistics for a patient
  fastify.get(
    '/patient/:patientId/stats',
    { onRequest: [authenticate] },
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
      }>,
      reply
    ) => {
      try {
        const { patientId } = request.params;

        const stats = await gdsService.getPatientStats(patientId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  // Compare two assessments
  fastify.get(
    '/compare/:id1/:id2',
    { onRequest: [authenticate] },
    async (
      request: FastifyRequest<{
        Params: { id1: string; id2: string };
      }>,
      reply
    ) => {
      try {
        const { id1, id2 } = request.params;

        const comparison = await gdsService.compareAssessments(id1, id2);

        return reply.send({
          success: true,
          data: comparison,
        });
      } catch (error: any) {
        if (error.message === 'GDS assessment not found') {
          throw new ApiError(404, 'One or both assessments not found');
        }
        throw error;
      }
    }
  );

  // Delete GDS assessment
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

        await gdsService.deleteAssessment(id, user.id);

        return reply.send({
          success: true,
          message: 'GDS assessment deleted successfully',
        });
      } catch (error: any) {
        if (error.message === 'GDS assessment not found') {
          throw new ApiError(404, 'GDS assessment not found');
        }
        throw error;
      }
    }
  );
}
