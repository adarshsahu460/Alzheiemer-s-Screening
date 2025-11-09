import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler for Fastify
 * Handles all errors and returns consistent error responses
 */
export function errorHandler(
  error: FastifyError | ApiError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.message,
    });
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      code: error.code,
    });
  }

  // Handle Fastify errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
    });
  }

  // Default server error
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
}
