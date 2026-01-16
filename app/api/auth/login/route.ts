import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials } from '@/lib/auth/accounts';
import { generateToken } from '@/lib/auth/jwt';
import { LoginRequest, LoginResponse } from '@/lib/types/auth';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token in httpOnly cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json<LoginResponse>(
        {
          success: false,
          error: 'Username and password are required',
        },
        { status: 400 }
      );
    }

    // Validate credentials
    const session = await validateCredentials(username, password);

    if (!session) {
      return NextResponse.json<LoginResponse>(
        {
          success: false,
          error: 'Invalid username or password',
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generateToken(session);

    // Set httpOnly cookie
    const response = NextResponse.json<LoginResponse>({
      success: true,
      session,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json<LoginResponse>(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
