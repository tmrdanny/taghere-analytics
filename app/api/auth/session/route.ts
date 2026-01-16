import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * GET /api/auth/session
 * Check current session status
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false,
      });
    }

    const session = await verifyToken(token);

    if (!session) {
      return NextResponse.json({
        success: false,
        authenticated: false,
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      session,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
    });
  }
}
