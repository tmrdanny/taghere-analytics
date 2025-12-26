/**
 * Incremental Data Sync
 * Refreshes SQLite cache with latest data from MongoDB bills collection
 *
 * Manual trigger only - no automatic scheduling
 */

import { smartSync, aggregateAndCache } from '../cache/aggregation-cache';
import { getCacheStats } from '../cache/sqlite';

/**
 * Execute the incremental sync process
 * Uses smart sync to only fetch missing dates + today
 */
export async function executeIncrementalSync() {
  try {
    console.log('[Incremental Sync] Starting smart SQLite cache refresh...');

    // Get cache stats before sync
    const beforeStats = getCacheStats();
    console.log('[Incremental Sync] Cache stats before:', beforeStats);

    // Use smart sync to only fetch missing dates + today
    const lookbackDays = parseInt(process.env.CACHE_INCREMENTAL_DAYS || '30', 10);
    const result = await smartSync(lookbackDays);

    console.log('[Incremental Sync] Smart sync completed!');
    console.log('[Incremental Sync] Synced dates:', result.syncedDates);
    console.log('[Incremental Sync] Cache stats after:', result.stats);

    return {
      success: true,
      message: result.syncedDates.length > 0
        ? `${result.syncedDates.length}개 날짜가 동기화되었습니다.`
        : '캐시가 최신 상태입니다.',
      syncedDates: result.syncedDates,
      stats: result.stats,
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
