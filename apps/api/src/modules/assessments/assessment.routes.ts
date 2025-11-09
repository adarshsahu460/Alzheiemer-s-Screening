import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.middleware';
import { gdsRoutes } from './gds/gds.routes';
import { npiRoutes } from './npi/npi.routes';
import { faqRoutes } from './faq/faq.routes';
import { cdrRoutes } from './cdr/cdr.routes';

/**
 * Assessment routes
 * Handles GDS, NPI, FAQ, and CDR assessments
 */
export async function assessmentRoutes(fastify: FastifyInstance) {
  // Register GDS routes
  await fastify.register(gdsRoutes, { prefix: '/gds' });
  
  // Register NPI routes
  await fastify.register(npiRoutes, { prefix: '/npi' });
  
  // Register FAQ routes
  await fastify.register(faqRoutes, { prefix: '/faq' });
  
  // Register CDR routes
  await fastify.register(cdrRoutes, { prefix: '/cdr' });

  // Get all assessments for a patient (all types)
  fastify.get(
    '/patient/:patientId',
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { patientId } = request.params as { patientId: string };
      // TODO: Implement get all assessments for patient (all types)
      return reply.send({
        message: 'Get all assessments for patient - To be implemented',
        patientId,
      });
    }
  );
}
