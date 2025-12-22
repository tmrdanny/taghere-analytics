/**
 * Incremental Data Sync
 * Refreshes SQLite cache with latest data from MongoDB bills collection
 *
 * Manual trigger only - no automatic scheduling
 */

import { aggregateAndCache } from '../cache/aggregation-cache';
import { getCacheStats } from '../cache/sqlite';

/**
 * Execute the incremental sync process
 * Refreshes SQLite cache with recent data from MongoDB
 */
export async function executeIncrementalSync() {
  try {
    console.log('[Incremental Sync] Starting SQLite cache refresh...');

    // Get cache stats before sync
    const beforeStats = getCacheStats();
    console.log('[Incremental Sync] Cache stats before:', beforeStats);

    // Refresh cache with incremental data (last 7 days by default)
    const incrementalDays = parseInt(process.env.CACHE_INCREMENTAL_DAYS || '7', 10);
    const stats = await aggregateAndCache('incremental', incrementalDays);

    console.log('[Incremental Sync] Cache refresh completed!');
    console.log('[Incremental Sync] Cache stats after:', stats);

    return {
      success: true,
      message: `캐시가 최근 ${incrementalDays}일 데이터로 새로고침되었습니다.`,
      metricsProcessed: {
        daily: stats.dailyStoreRecords,
        menu: stats.dailyMenuRecords,
      },
      cacheStats: stats,
    };
  } catch (error) {
    console.error('[Incremental Sync] Failed to refresh cache:', error);
    throw error;
  }
}

/**
 * Execute full cache refresh (all historical data)
 */
export async function executeFullSync() {
  try {
    console.log('[Full Sync] Starting full SQLite cache refresh...');

    const stats = await aggregateAndCache('full');

    console.log('[Full Sync] Full cache refresh completed!');

    return {
      success: true,
      message: '전체 캐시가 새로고침되었습니다.',
      metricsProcessed: {
        daily: stats.dailyStoreRecords,
        menu: stats.dailyMenuRecords,
      },
      cacheStats: stats,
    };
  } catch (error) {
    console.error('[Full Sync] Failed to refresh cache:', error);
    throw error;
  }
}

/**
 * Get current sync/cache status
 */
export async function getSyncStatus() {
  try {
    const stats = getCacheStats();
    return {
      dailyMetricsCount: stats.dailyStoreRecords,
      menuMetricsCount: stats.dailyMenuRecords,
      dateRange: stats.dateRange,
    };
  } catch (error) {
    console.error('[Sync] Error getting sync status:', error);
    throw error;
  }
}

// Keep old function name for backward compatibility
export const executeWeeklySync = executeIncrementalSync;
