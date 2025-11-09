import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiError } from '../utils/error-handler';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const decoded = await request.jwtVerify() as any;
    
    // Attach user info to request
    request.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (err) {
    throw new ApiError(401, 'Unauthorized - Invalid or expired token', 'UNAUTHORIZED');
  }
}

/**
 * Role-based access control middleware
 * Checks if user has required role
 */
export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      throw new ApiError(401, 'Unauthorized - Please login first', 'UNAUTHORIZED');
    }

    if (!roles.includes(user.role)) {
      throw new ApiError(
        403,
        `Forbidden - Required role: ${roles.join(' or ')}`,
        'FORBIDDEN'
      );
    }
  };
}

/**
 * Combine authentication and role check
 */
export function authenticateWithRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    await requireRole(roles)(request, reply);
  };
}
