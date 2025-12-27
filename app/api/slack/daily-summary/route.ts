import { NextRequest, NextResponse } from 'next/server';
import { getHealthCheckData } from '@/lib/queries/health-check';
import { sendDailySummary } from '@/lib/slack/notifications';
import { getDb } from '@/lib/cache/sqlite';

/**
 * GET /api/slack/daily-summary
 *
 * Sends daily health check summary to Slack
 * Should be called by cron job at 10:00 AM KST
 *
 * Query params:
 *   - token: Security token to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // Simple token validation (use CACHE_REFRESH_TOKEN)
    const expectedToken = process.env.CACHE_REFRESH_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current health check data
    const healthData = getHealthCheckData();

    // Get previous day's status from SQLite to find "new" warning/danger stores
    // For now, we'll consider stores that recently crossed thresholds
    const newWarningStores = healthData.stores
      .filter((s) => s.status === 'warning' && s.daysSinceLastOrder >= 8 && s.daysSinceLastOrder <= 10)
      .map((s) => ({
        storeName: s.storeName,
        healthScore: s.healthScore,
        daysSinceLastOrder: s.daysSinceLastOrder,
      }));

    const newDangerStores = healthData.stores
      .filter((s) => s.status === 'danger' && s.daysSinceLastOrder >= 31 && s.daysSinceLastOrder <= 35)
      .map((s) => ({
        storeName: s.storeName,
        healthScore: s.healthScore,
        daysSinceLastOrder: s.daysSinceLastOrder,
      }));

    // Dashboard URL
    const dashboardUrl = 'https://taghere-analytics-8gzo.onrender.com/health';

    // Send to Slack
    const success = await sendDailySummary({
      summary: healthData.summary,
      newWarningStores,
      newDangerStores,
      dashboardUrl,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Daily summary sent to Slack',
        data: {
          summary: healthData.summary,
          newWarningCount: newWarningStores.length,
          newDangerCount: newDangerStores.length,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send Slack message' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Daily summary API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slack/daily-summary
 *
 * Same as GET but accepts POST for webhook services
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
