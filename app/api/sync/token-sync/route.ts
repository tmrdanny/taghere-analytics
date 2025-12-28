/**
 * API Route for Token-Protected Data Sync
 *
 * GET /api/sync/token-sync - Execute incremental sync with token auth
 * Used by GitHub Actions for automated daily sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeIncrementalSync } from '@/lib/sync/weekly-data-sync';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // Token validation
    const expectedToken = process.env.CACHE_REFRESH_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Token Sync] Valid token provided, executing incremental sync...');
    const result = await executeIncrementalSync();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[Token Sync] Error executing sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute sync',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
