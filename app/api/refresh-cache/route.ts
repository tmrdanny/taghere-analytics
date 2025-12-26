import { NextRequest, NextResponse } from 'next/server';
import { aggregateAndCache, smartSync } from '@/lib/cache/aggregation-cache';

/**
 * POST /api/refresh-cache
 *
 * Manually trigger cache refresh
 *
 * Body:
 *   - mode: 'full' | 'incremental' | 'smart' (default: smart)
 *   - days: number (lookback days for smart mode, default: 30)
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

    const mode = body.mode || 'smart';
    const days = body.days || 30;

    if (mode !== 'full' && mode !== 'incremental' && mode !== 'smart') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mode. Must be "full", "incremental", or "smart"',
        },
        { status: 400 }
      );
    }

    console.log(`[API] Cache refresh requested: mode=${mode}, days=${days}`);

    // Use smart sync for default mode
    if (mode === 'smart') {
      const result = await smartSync(days);
      return NextResponse.json({
        success: true,
        message: result.syncedDates.length > 0
          ? `Synced ${result.syncedDates.length} date(s): ${result.syncedDates.join(', ')}`
          : 'Cache is already up to date',
        mode,
        syncedDates: result.syncedDates,
        stats: result.stats,
      });
    }

    // Run aggregation for full/incremental
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
