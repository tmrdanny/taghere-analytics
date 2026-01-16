/**
 * JWT Token Generation and Verification
 */

import { SignJWT, jwtVerify } from 'jose';
import { AuthSession } from '@/lib/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Convert expiration string to seconds
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default: return 7 * 24 * 60 * 60;
  }
}

/**
 * Generate JWT token from session
 */
export async function generateToken(session: AuthSession): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const expiresInSeconds = parseExpiresIn(JWT_EXPIRES_IN);

  const token = await new SignJWT({
    username: session.username,
    role: session.role,
    assignedStoreIds: session.assignedStoreIds,
    displayName: session.displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret);

  return token;
}

/**
 * Verify JWT token and return session
 */
export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      username: payload.username as string,
      role: payload.role as 'master' | 'franchise',
      assignedStoreIds: payload.assignedStoreIds as string[] | undefined,
      displayName: payload.displayName as string,
      expiresAt: payload.exp * 1000,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
