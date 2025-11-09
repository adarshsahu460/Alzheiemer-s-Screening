import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement role-based access control
    const user = (request as any).user;
    
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    if (roles.length > 0 && !roles.includes(user.role)) {
      return reply.code(403).send({ error: 'Forbidden - Insufficient permissions' });
    }
  };
}
