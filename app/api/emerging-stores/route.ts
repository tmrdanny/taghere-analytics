import { NextRequest, NextResponse } from 'next/server';
import { getEmergingStoresData } from '@/lib/queries/emerging-stores';
import cache, { generateCacheKey } from '@/lib/cache';

/**
 * GET /api/emerging-stores
 *
 * Query params:
 *   - recentDays: number of recent days to analyze (default: 7)
 *   - compareDays: number of comparison days (default: 7)
 *   - limit: number of stores to return (default: 20)
 *   - minGrowthScore: minimum growth score filter (default: no filter)
 *   - storeIds: comma-separated store IDs (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const recentDays = parseInt(searchParams.get('recentDays') || '7', 10);
    const compareDays = parseInt(searchParams.get('compareDays') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const minGrowthScoreParam = searchParams.get('minGrowthScore');
    const minGrowthScore = minGrowthScoreParam ? parseFloat(minGrowthScoreParam) : null;

    // Parse store IDs
    const storeIdsParam = searchParams.get('storeIds');
    const storeIds = storeIdsParam
      ? storeIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;

    // Generate cache key (cache for 5 minutes)
    const cacheKey = generateCacheKey('emerging-stores', {
      recentDays,
      compareDays,
      limit,
      minGrowthScore: minGrowthScore ?? 'none',
      storeIds: storeIds?.join(',') || 'all',
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

    // Get emerging stores data
    const result = getEmergingStoresData(recentDays, compareDays, storeIds);

    // Apply filters
    let filteredStores = result.stores;

    // Filter by minimum growth score
    if (minGrowthScore !== null) {
      filteredStores = filteredStores.filter(s => s.growthScore >= minGrowthScore);
    }

    // Apply limit
    const limitedStores = filteredStores.slice(0, limit);

    const response = {
      summary: result.summary,
      stores: limitedStores,
      filter: {
        recentDays,
        compareDays,
        limit,
        minGrowthScore,
        storeIds: storeIds || null,
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
    console.error('Emerging Stores API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
