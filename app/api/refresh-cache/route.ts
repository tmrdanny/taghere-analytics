import { NextRequest, NextResponse } from 'next/server';
import { aggregateAndCache } from '@/lib/cache/aggregation-cache';

/**
 * POST /api/refresh-cache
 *
 * Manually trigger cache refresh
 *
 * Body:
 *   - mode: 'full' | 'incremental' (default: incremental)
 *   - days: number (for incremental mode, default: 7)
 *   - token: string (required for security)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check authorization token
    const requiredToken = process.env.CACHE_REFRESH_TOKEN;
    if (requiredToken && body.token !== requiredToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid token',
        },
        { status: 401 }
      );
    }

    const mode = body.mode || 'incremental';
    const days = body.days || 7;

    if (mode !== 'full' && mode !== 'incremental') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mode. Must be "full" or "incremental"',
        },
        { status: 400 }
      );
    }

    console.log(`[API] Cache refresh requested: mode=${mode}, days=${days}`);

    // Run aggregation
    const stats = await aggregateAndCache(mode, days);

    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      mode,
      days: mode === 'incremental' ? days : undefined,
      stats,
    });
  } catch (error: any) {
    console.error('Cache refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/refresh-cache
 *
 * Get cache statistics
 */
export async function GET() {
  try {
    const { getCacheStats } = await import('@/lib/cache/sqlite');
    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
