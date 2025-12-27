import { NextRequest, NextResponse } from 'next/server';
import { getHealthCheckData, HealthStatus } from '@/lib/queries/health-check';
import cache, { generateCacheKey } from '@/lib/cache';

/**
 * GET /api/health-check
 *
 * Query params:
 *   - status: 'active' | 'warning' | 'danger' | 'churned' (optional, filter by status)
 *   - limit: number of stores to return (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse status filter
    const statusParam = searchParams.get('status');
    const statusFilter = statusParam && ['active', 'warning', 'danger', 'churned'].includes(statusParam)
      ? (statusParam as HealthStatus)
      : undefined;

    // Parse limit
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Generate cache key (cache for 5 minutes)
    const cacheKey = generateCacheKey('health-check', {
      status: statusFilter || 'all',
      limit,
    });

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    // Get health check data
    const result = getHealthCheckData(statusFilter);

    // Apply limit to stores
    const limitedStores = result.stores.slice(0, limit);

    const response = {
      summary: result.summary,
      stores: limitedStores,
      filter: {
        status: statusFilter || 'all',
        limit,
      },
    };

    // Cache result for 5 minutes
    cache.set(cacheKey, response, 5 * 60 * 1000);

    return NextResponse.json({
      success: true,
      ...response,
      cached: false,
    });
  } catch (error: any) {
    console.error('Health Check API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
