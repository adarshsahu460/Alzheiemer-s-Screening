import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { config } from '../../config';
import {
  authenticateUser,
  createUser,
  findRefreshToken,
  storeRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
  findUserById,
} from './auth.service';
import { authenticate } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/error-handler';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['CLINICIAN', 'CAREGIVER', 'ADMIN']),
});

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Generate access and refresh tokens for a user
 */
function generateTokens(fastify: FastifyInstance, userId: string, email: string, role: string) {
  const accessToken = fastify.jwt.sign(
    { id: userId, email, role },
    { expiresIn: config.jwtExpiresIn }
  );

  const refreshToken = fastify.jwt.sign(
    { id: userId, email, role, type: 'refresh' },
    { 
      secret: config.jwtRefreshSecret,
      expiresIn: config.jwtRefreshExpiresIn 
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Authentication routes
 * Handles login, register, refresh token, and logout
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    // Authenticate user
    const user = await authenticateUser(body);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      fastify,
      user.id,
      user.email,
      user.role
    );

    // Calculate refresh token expiry (7 days from now)
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

    // Set refresh token in HTTP-only cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      expires: refreshExpiresAt,
    });

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
      },
    });
  });

  // Register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    // Create user
    const user = await createUser(body);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      fastify,
      user.id,
      user.email,
      user.role
    );

    // Calculate refresh token expiry
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

    // Set refresh token in HTTP-only cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      expires: refreshExpiresAt,
    });

    return reply.status(201).send({
      success: true,
      data: {
        user,
        accessToken,
      },
      message: 'User registered successfully',
    });
  });

  // Refresh token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token not found', 'NO_REFRESH_TOKEN');
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = fastify.jwt.verify(refreshToken, { key: config.jwtRefreshSecret });
    } catch (error) {
      throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Check if token exists in database
    const storedToken = await findRefreshToken(refreshToken);
    if (!storedToken) {
      throw new ApiError(401, 'Refresh token not found', 'TOKEN_NOT_FOUND');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await deleteRefreshToken(refreshToken);
      throw new ApiError(401, 'Refresh token expired', 'TOKEN_EXPIRED');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      fastify,
      decoded.id,
      decoded.email,
      decoded.role
    );

    // Delete old refresh token
    await deleteRefreshToken(refreshToken);

    // Calculate new refresh token expiry
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    // Store new refresh token
    await storeRefreshToken(decoded.id, newRefreshToken, refreshExpiresAt);

    // Set new refresh token in cookie
    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      expires: refreshExpiresAt,
    });

    return reply.send({
      success: true,
      data: { accessToken },
    });
  });

  // Logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
      reply.clearCookie('refreshToken');
    }

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // Logout all devices
  fastify.post(
    '/logout-all',
    { onRequest: [authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
      }

      await deleteAllUserRefreshTokens(request.user.id);
      reply.clearCookie('refreshToken');

      return reply.send({
        success: true,
        message: 'Logged out from all devices',
      });
    }
  );

  // Get current user
  fastify.get(
    '/me',
    { onRequest: [authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
      }

      const user = await findUserById(request.user.id);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      return reply.send({
        success: true,
        data: { user },
      });
    }
  );
}
