import bcrypt from 'bcrypt';
import { prisma } from '@alzheimer/db';
import { ApiError } from '../../utils/error-handler';

/**
 * Authentication service
 * Handles user authentication, registration, and token management
 */

const SALT_ROUNDS = 10;

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'CLINICIAN' | 'CAREGIVER' | 'PATIENT';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find user by ID
 */
export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserData) {
  // Check if user already exists
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists', 'EMAIL_EXISTS');
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(credentials: LoginCredentials) {
  const user = await findUserByEmail(credentials.email);

  if (!user) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await comparePasswords(
    credentials.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date
) {
  return prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

/**
 * Find refresh token
 */
export async function findRefreshToken(token: string) {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

/**
 * Delete refresh token (logout)
 */
export async function deleteRefreshToken(token: string) {
  try {
    await prisma.refreshToken.delete({
      where: { token },
    });
  } catch (error) {
    // Token might not exist, which is fine
  }
}

/**
 * Delete all user's refresh tokens (logout all devices)
 */
export async function deleteAllUserRefreshTokens(userId: string) {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens() {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
