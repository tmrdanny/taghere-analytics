import { NextRequest, NextResponse } from 'next/server';
import { getCachedDashboardKPIs } from '@/lib/cache/aggregation-cache';
import { MetricsFilter } from '@/lib/types/metrics';
import cache, { generateCacheKey, getDefaultTTL } from '@/lib/cache';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, subYears } from 'date-fns';

/**
 * Parse date range preset or custom dates
 */
function parseDateRange(searchParams: URLSearchParams): {
  startDate: Date;
  endDate: Date;
} {
  const preset = searchParams.get('preset');
  const customStart = searchParams.get('startDate');
  const customEnd = searchParams.get('endDate');

  // Custom date range
  if (customStart && customEnd) {
    return {
      startDate: startOfDay(new Date(customStart)),
      endDate: endOfDay(new Date(customEnd)),
    };
  }

  // Preset date ranges
  const now = new Date();

  switch (preset) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };

    case 'last7days':
      return {
        startDate: startOfDay(subDays(now, 6)),
        endDate: endOfDay(now),
      };

    case 'last30days':
      return {
        startDate: startOfDay(subDays(now, 29)),
        endDate: endOfDay(now),
      };

    case 'last90days':
      return {
        startDate: startOfDay(subDays(now, 89)),
        endDate: endOfDay(now),
      };

    case 'last180days':
      return {
        startDate: startOfDay(subDays(now, 179)),
        endDate: endOfDay(now),
      };

    case 'lastYear':
      return {
        startDate: startOfDay(subYears(now, 1)),
        endDate: endOfDay(now),
      };

    case 'allData':
      // Query from far past to get all available data
      return {
        startDate: startOfDay(subYears(now, 10)),
        endDate: endOfDay(now),
      };

    case 'thisMonth':
      return {
        startDate: startOfMonth(now),
        endDate: endOfDay(now),
      };

    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    }

    default:
      // Default to last 7 days
      return {
        startDate: startOfDay(subDays(now, 6)),
        endDate: endOfDay(now),
      };
  }
}

/**
 * GET /api/dashboard
 *
 * Query params:
 *   - preset: 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth'
 *   - startDate: ISO date string (custom range)
 *   - endDate: ISO date string (custom range)
 *   - storeIds: comma-separated store IDs
 *   - limit: number of items in top lists (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse date range
    const { startDate, endDate } = parseDateRange(searchParams);

    // Parse store IDs
    const storeIdsParam = searchParams.get('storeIds');
    const storeIds = storeIdsParam
      ? storeIdsParam.split(',').map((id) => id.trim())
      : undefined;

    // Parse limit
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Build filter
    const filter: MetricsFilter = {
      startDate,
      endDate,
      storeIds,
      limit,
    };

    // Generate cache key
    const cacheKey = generateCacheKey('dashboard', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      storeIds: storeIds?.join(',') || 'all',
      limit,
    });

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        filter: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          storeIds,
          limit,
        },
      });
    }

    // Query metrics (from SQLite cache)
    const data = await getCachedDashboardKPIs(filter);

    // Cache result
    cache.set(cacheKey, data, getDefaultTTL());

    return NextResponse.json({
      success: true,
      data,
      cached: false,
      filter: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        storeIds,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
