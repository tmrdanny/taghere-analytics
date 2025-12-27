import { NextRequest, NextResponse } from 'next/server';
import { getHealthCheckData, StoreHealthData } from '@/lib/queries/health-check';
import { sendHighValueStoreAlert } from '@/lib/slack/notifications';
import { getDb } from '@/lib/cache/sqlite';

// Stores to exclude from analysis
const EXCLUDED_STORE_NAMES = [
  '태그히어 데모 (테스트)',
  '호미',
];

/**
 * Get top 20% GMV threshold based on last 30 days
 */
function getTop20PercentThreshold(): number {
  const db = getDb();

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  // Build exclusion clause
  const excludePlaceholders = EXCLUDED_STORE_NAMES.map(() => '?').join(',');

  // Get monthly GMV per store
  const storeGmvs = db.prepare(`
    SELECT
      storeId,
      SUM(gmv) as monthlyGmv
    FROM metrics_daily_store
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    GROUP BY storeId
    ORDER BY monthlyGmv DESC
  `).all(startDate, endDate, ...EXCLUDED_STORE_NAMES) as Array<{
    storeId: string;
    monthlyGmv: number;
  }>;

  if (storeGmvs.length === 0) {
    return 0;
  }

  // Find top 20% threshold
  const top20Index = Math.floor(storeGmvs.length * 0.2);
  return storeGmvs[top20Index]?.monthlyGmv || 0;
}

/**
 * Check if a store is in top 20% by GMV
 */
function isHighValueStore(storeId: string, threshold: number): boolean {
  const db = getDb();

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const result = db.prepare(`
    SELECT SUM(gmv) as monthlyGmv
    FROM metrics_daily_store
    WHERE storeId = ? AND date >= ? AND date <= ?
  `).get(storeId, startDate, endDate) as { monthlyGmv: number } | undefined;

  return (result?.monthlyGmv || 0) >= threshold;
}

/**
 * GET /api/slack/high-value-alert
 *
 * Checks for high-value stores that recently became danger status
 * and sends immediate alerts
 *
 * Query params:
 *   - token: Security token to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // Simple token validation
    const expectedToken = process.env.CACHE_REFRESH_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get health check data
    const healthData = getHealthCheckData();

    // Get top 20% threshold
    const threshold = getTop20PercentThreshold();

    // Find high-value stores that recently became danger
    // (31-35 days since last order = just crossed into danger)
    const recentDangerStores = healthData.stores.filter(
      (s) => s.status === 'danger' && s.daysSinceLastOrder >= 31 && s.daysSinceLastOrder <= 35
    );

    // Dashboard URL
    const dashboardUrl = 'https://taghere-analytics-8gzo.onrender.com/health';

    const alertsSent: string[] = [];

    for (const store of recentDangerStores) {
      if (isHighValueStore(store.storeId, threshold)) {
        const success = await sendHighValueStoreAlert({
          store: {
            storeName: store.storeName,
            storeId: store.storeId,
            healthScore: store.healthScore,
            previousStatus: 'warning',
            currentStatus: 'danger',
            daysSinceLastOrder: store.daysSinceLastOrder,
            recentGmv: store.recentGmv,
            previousGmv: store.previousGmv,
            gmvChange: store.gmvChange,
          },
          isTop20Percent: true,
          dashboardUrl,
        });

        if (success) {
          alertsSent.push(store.storeName);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${recentDangerStores.length} recent danger stores, sent ${alertsSent.length} alerts`,
      data: {
        threshold,
        checkedStores: recentDangerStores.length,
        alertsSent,
      },
    });
  } catch (error: any) {
    console.error('High value alert API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slack/high-value-alert
 *
 * Same as GET but accepts POST for webhook services
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
