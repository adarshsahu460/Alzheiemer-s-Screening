import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pdfService } from './pdf.service';
import { authenticate } from '../../middleware/auth.middleware';

const paramsSchema = z.object({
  patientId: z.string().uuid(),
});

export const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Generate and download PDF report for a patient
   * GET /api/reports/patient/:patientId/pdf
   */
  fastify.get<{ Params: { patientId: string } }>(
    '/patient/:patientId/pdf',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      try {
        const { patientId } = request.params;

        // Generate PDF
        const pdfBuffer = await pdfService.generatePatientReport(patientId);

        // Set headers for PDF download
        reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `attachment; filename="patient-report-${patientId}-${Date.now()}.pdf"`
          )
          .header('Content-Length', pdfBuffer.length)
          .send(pdfBuffer);
      } catch (error) {
        fastify.log.error(error);
        if (error instanceof Error && error.message === 'Patient not found') {
          reply.status(404).send({ error: 'Patient not found' });
        } else {
          reply.status(500).send({ error: 'Failed to generate PDF report' });
        }
      }
    }
  );

  /**
   * Preview PDF report (inline display)
   * GET /api/reports/patient/:patientId/pdf/preview
   */
  fastify.get<{ Params: { patientId: string } }>(
    '/patient/:patientId/pdf/preview',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      try {
        const { patientId } = request.params;

        // Generate PDF
        const pdfBuffer = await pdfService.generatePatientReport(patientId);

        // Set headers for inline display
        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', 'inline')
          .header('Content-Length', pdfBuffer.length)
          .send(pdfBuffer);
      } catch (error) {
        fastify.log.error(error);
        if (error instanceof Error && error.message === 'Patient not found') {
          reply.status(404).send({ error: 'Patient not found' });
        } else {
          reply.status(500).send({ error: 'Failed to generate PDF report' });
        }
      }
    }
  );

  /**
   * Get report metadata without generating PDF
   * GET /api/reports/patient/:patientId/metadata
   */
  fastify.get<{ Params: { patientId: string } }>(
    '/patient/:patientId/metadata',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      try {
        const { patientId } = request.params;

        // For now, return basic metadata
        // This can be expanded to include report statistics
        reply.send({
          patientId,
          reportDate: new Date().toISOString(),
          status: 'available',
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to retrieve report metadata' });
      }
    }
  );
};
