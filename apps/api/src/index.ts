import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from './config';
import { errorHandler } from './utils/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { patientRoutes } from './modules/patients/patient.routes';
import { assessmentRoutes } from './modules/assessments/assessment.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { reportsRoutes } from './modules/reports/reports.routes';

/**
 * Build Fastify server instance with all plugins and routes
 */
export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await fastify.register(cookie);

  await fastify.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: config.jwtExpiresIn,
    },
  });

  // Health check route
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(patientRoutes, { prefix: '/api/patients' });
  await fastify.register(assessmentRoutes, { prefix: '/api/assessments' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(reportsRoutes, { prefix: '/api/reports' });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  try {
    const server = await buildServer();
    
    await server.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`🚀 Server running at http://${config.host}:${config.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
