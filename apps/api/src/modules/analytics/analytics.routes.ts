import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { analyticsService } from './analytics.service';

/**
 * Analytics Routes
 * 
 * Endpoints:
 * - GET /api/analytics/patient/:patientId/overview - Comprehensive patient overview
 * - GET /api/analytics/patient/:patientId/correlations - Cross-assessment correlations
 * - GET /api/analytics/patient/:patientId/progression - Progression report over time
 * - GET /api/analytics/dashboard/summary - Dashboard summary statistics
 */

const patientIdParamSchema = z.object({
  patientId: z.string().cuid(),
});

const progressionQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * Get comprehensive patient overview
   */
  fastify.get(
    '/patient/:patientId/overview',
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);

        const overview = await analyticsService.getPatientOverview(patientId);

        return reply.send(overview);
      } catch (error) {
        if (error instanceof Error && error.message === 'Patient not found') {
          return reply.code(404).send({ error: 'Patient not found' });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to fetch patient overview',
        });
      }
    }
  );

  /**
   * Get cross-assessment correlations
   */
  fastify.get(
    '/patient/:patientId/correlations',
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);

        const correlations = await analyticsService.getCrossAssessmentCorrelations(
          patientId
        );

        return reply.send(correlations);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to calculate correlations',
        });
      }
    }
  );

  /**
   * Get progression report
   */
  fastify.get(
    '/patient/:patientId/progression',
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
        Querystring: { startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { patientId } = patientIdParamSchema.parse(request.params);
        const query = progressionQuerySchema.parse(request.query);

        const startDate = query.startDate ? new Date(query.startDate) : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;

        const progression = await analyticsService.getProgressionReport(
          patientId,
          startDate,
          endDate
        );

        return reply.send(progression);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to generate progression report',
        });
      }
    }
  );

  /**
   * Get dashboard summary statistics
   * (Aggregate statistics across all patients for admin/researcher view)
   */
  fastify.get(
    '/dashboard/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // This would aggregate stats across all patients
        // Simplified implementation - expand as needed
        return reply.send({
          message: 'Dashboard summary - to be implemented with aggregated patient data',
          totalPatients: 0,
          totalAssessments: 0,
          recentActivity: [],
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to fetch dashboard summary',
        });
      }
    }
  );
}
