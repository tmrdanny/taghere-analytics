import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clear authentication cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete('auth_token');

  return response;
}
