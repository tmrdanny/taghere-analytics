/**
 * Incremental Data Sync
 * Fetches only missing metrics data since the last sync
 * Compares with existing data and fills gaps
 * 
 * Manual trigger only - no automatic scheduling
 */

import { getDb } from '../mongodb';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { MetricsDailyStore, MetricsDailyStoreMenu } from '../types/metrics';

const TIMEZONE = 'Asia/Seoul'; // KST

/**
 * Get the date range for incremental sync
 * Finds the newest date in the database and syncs from that point onwards
 */
async function getIncrementalSyncDateRange(): Promise<{ startDate: Date; endDate: Date }> {
  const db = await getDb();

  // Find the newest date in metrics_daily_store
  const newestRecord = await db
    .collection<MetricsDailyStore>('metrics_daily_store')
    .findOne({}, { sort: { date: -1 } });

  // Get current time in KST
  const nowKST = toZonedTime(new Date(), TIMEZONE);
  const endDate = endOfDay(nowKST);

  let startDate: Date;

  if (newestRecord && newestRecord.date) {
    // Start from the next day after the newest record
    const newestDate = newestRecord.date instanceof Date ? newestRecord.date : new Date(newestRecord.date);
    startDate = startOfDay(new Date(newestDate.getTime() + 24 * 60 * 60 * 1000));
  } else {
    // If no data exists, start from 30 days ago
    startDate = startOfDay(subDays(nowKST, 30));
  }

  // Return dates as-is (MongoDB will handle UTC conversion)
  return {
    startDate,
    endDate,
  };
}

/**
 * Create a unique key for deduplication
 * Format: storeId|date (YYYY-MM-DD)
 */
function createMetricsKey(record: MetricsDailyStore): string {
  const dateStr = record.date instanceof Date
    ? record.date.toISOString().split('T')[0]
    : new Date(record.date).toISOString().split('T')[0];
  return `${record.storeId}|${dateStr}`;
}

/**
 * Create a unique key for menu metrics deduplication
 * Format: storeId|menuId|date (YYYY-MM-DD)
 */
function createMenuMetricsKey(record: MetricsDailyStoreMenu): string {
  const dateStr = record.date instanceof Date
    ? record.date.toISOString().split('T')[0]
    : new Date(record.date).toISOString().split('T')[0];
  return `${record.storeId}|${record.menuId}|${dateStr}`;
}

/**
 * Fetch metrics from MongoDB for missing data
 */
export async function fetchIncrementalMetrics() {
  try {
    const { startDate, endDate } = await getIncrementalSyncDateRange();

    console.log(`[Incremental Sync] Fetching new metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const db = await getDb();

    // Fetch daily store metrics
    const dailyMetrics = await db
      .collection<MetricsDailyStore>('metrics_daily_store')
      .find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    // Fetch daily store-menu metrics
    const menuMetrics = await db
      .collection<MetricsDailyStoreMenu>('metrics_daily_store_menu')
      .find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    console.log(`[Incremental Sync] Fetched ${dailyMetrics.length} daily metrics and ${menuMetrics.length} menu metrics`);

    return { dailyMetrics, menuMetrics, startDate, endDate };
  } catch (error) {
    console.error('[Incremental Sync] Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Merge new metrics with existing ones, handling deduplication
 * Strategy: Replace existing records with the same key (storeId + date)
 */
export async function mergeMetrics(
  newDailyMetrics: MetricsDailyStore[],
  newMenuMetrics: MetricsDailyStoreMenu[]
) {
  try {
    const db = await getDb();
    const bulkOperations: any[] = [];

    // Prepare bulk operations for daily metrics
    const dailyBulkOps = newDailyMetrics.map((metric) => ({
      updateOne: {
        filter: {
          storeId: metric.storeId,
          date: metric.date,
        },
        update: {
          $set: metric,
        },
        upsert: true,
      },
    }));

    // Prepare bulk operations for menu metrics
    const menuBulkOps = newMenuMetrics.map((metric) => ({
      updateOne: {
        filter: {
          storeId: metric.storeId,
          menuId: metric.menuId,
          date: metric.date,
        },
        update: {
          $set: metric,
        },
        upsert: true,
      },
    }));

    // Execute bulk operations
    let dailyResult = { upsertedCount: 0, modifiedCount: 0 };
    let menuResult = { upsertedCount: 0, modifiedCount: 0 };

    if (dailyBulkOps.length > 0) {
      const dailyCollection = db.collection('metrics_daily_store');
      const result = await dailyCollection.bulkWrite(dailyBulkOps, { ordered: false });
      dailyResult = {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
      };
      console.log(
        `[Incremental Sync] Daily metrics: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`
      );
    }

    if (menuBulkOps.length > 0) {
      const menuCollection = db.collection('metrics_daily_store_menu');
      const result = await menuCollection.bulkWrite(menuBulkOps, { ordered: false });
      menuResult = {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
      };
      console.log(
        `[Incremental Sync] Menu metrics: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`
      );
    }

    return {
      success: true,
      dailyMetrics: dailyResult,
      menuMetrics: menuResult,
    };
  } catch (error) {
    console.error('[Incremental Sync] Error merging metrics:', error);
    throw error;
  }
}

/**
 * Get sync status and statistics
 */
export async function getSyncStatus() {
  try {
    const db = await getDb();

    const dailyCount = await db.collection('metrics_daily_store').countDocuments();
    const menuCount = await db.collection('metrics_daily_store_menu').countDocuments();

    // Get the date range of existing data
    const oldestDaily = await db
      .collection('metrics_daily_store')
      .findOne({}, { sort: { date: 1 } });

    const newestDaily = await db
      .collection('metrics_daily_store')
      .findOne({}, { sort: { date: -1 } });

    return {
      dailyMetricsCount: dailyCount,
      menuMetricsCount: menuCount,
      dateRange: {
        oldest: oldestDaily?.date || null,
        newest: newestDaily?.date || null,
      },
    };
  } catch (error) {
    console.error('[Weekly Sync] Error getting sync status:', error);
    throw error;
  }
}

/**
 * Execute the full incremental sync process
 * Called manually via API or button click
 */
export async function executeIncrementalSync() {
  try {
    console.log('[Incremental Sync] Starting incremental data sync...');
    
    const before = await getSyncStatus();
    console.log('[Incremental Sync] Status before sync:', before);

    // Fetch new data
    const { dailyMetrics, menuMetrics, startDate, endDate } = await fetchIncrementalMetrics();

    if (dailyMetrics.length === 0 && menuMetrics.length === 0) {
      console.log('[Incremental Sync] No new data to sync');
      return {
        success: true,
        message: 'No new data to sync',
        metricsProcessed: {
          daily: 0,
          menu: 0,
        },
      };
    }

    // Merge with existing data (deduplication via upsert)
    const mergeResult = await mergeMetrics(dailyMetrics, menuMetrics);

    const after = await getSyncStatus();
    console.log('[Incremental Sync] Status after sync:', after);

    console.log('[Incremental Sync] Incremental data sync completed successfully!');

    return {
      success: true,
      syncedDateRange: { startDate, endDate },
      metricsProcessed: {
        daily: dailyMetrics.length,
        menu: menuMetrics.length,
      },
      mergeResult,
    };
  } catch (error) {
    console.error('[Incremental Sync] Failed to execute incremental sync:', error);
    throw error;
  }
}

/**
 * Execute the full weekly sync process
 * Called manually via API or button click
 */
export async function executeWeeklySync() {
  try {
    console.log('[Incremental Sync] Starting incremental data sync...');
    
    const before = await getSyncStatus();
    console.log('[Incremental Sync] Status before sync:', before);

    // Fetch new data
    const { dailyMetrics, menuMetrics, startDate, endDate } = await fetchIncrementalMetrics();

    if (dailyMetrics.length === 0 && menuMetrics.length === 0) {
      console.log('[Incremental Sync] No new data to sync');
      return {
        success: true,
        message: 'No new data to sync',
        metricsProcessed: {
          daily: 0,
          menu: 0,
        },
      };
    }

    // Merge with existing data (deduplication via upsert)
    const mergeResult = await mergeMetrics(dailyMetrics, menuMetrics);

    const after = await getSyncStatus();
    console.log('[Incremental Sync] Status after sync:', after);

    console.log('[Incremental Sync] Incremental data sync completed successfully!');

    return {
      success: true,
      syncedDateRange: { startDate, endDate },
      metricsProcessed: {
        daily: dailyMetrics.length,
        menu: menuMetrics.length,
      },
      mergeResult,
    };
  } catch (error) {
    console.error('[Incremental Sync] Failed to execute incremental sync:', error);
    throw error;
  }
}
