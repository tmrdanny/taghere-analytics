import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { AuthSession } from '@/lib/types/auth';

/**
 * Authentication middleware
 * Verifies JWT token and passes session to handler
 */
export async function withAuth(
  request: NextRequest,
  handler: (session: AuthSession, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const session = await verifyToken(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    return handler(session, request);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Master-only middleware
 * Requires user to be authenticated with master role
 */
export async function withMasterOnly(
  request: NextRequest,
  handler: (session: AuthSession, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (session, req) => {
    if (session.role !== 'master') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Master access required' },
        { status: 403 }
      );
    }
    return handler(session, req);
  });
}
