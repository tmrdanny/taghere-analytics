/**
 * Build SQLite cache from MongoDB during Render build phase
 * This runs during `npm run build-cache` in the buildCommand
 *
 * Usage:
 *   npx tsx scripts/build-cache.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { aggregateAndCache } from '../lib/cache/aggregation-cache';
import { getCacheStats, closeDb } from '../lib/cache/sqlite';

// Calculate days from 2023-01-01 to today
function getDaysSince2023(): number {
  const startDate = new Date('2023-01-01');
  const today = new Date();
  const diffTime = today.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const LOOKBACK_DAYS = getDaysSince2023();

async function buildCache() {
  const startTime = Date.now();

  console.log('='.repeat(50));
  console.log('[Build Cache] Starting SQLite cache build from MongoDB');
  console.log('='.repeat(50));
  console.log(`\nLookback Days: ${LOOKBACK_DAYS} (from 2023-01-01)`);
  console.log(`SQLite Path: ${process.env.SQLITE_DB_PATH || 'data/cache.db'}`);
  console.log('');

  try {
    // Build cache with full historical data from 2023-01-01
    console.log('[Build Cache] Aggregating data from MongoDB...\n');

    const stats = await aggregateAndCache('full', LOOKBACK_DAYS);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('[Build Cache] COMPLETED');
    console.log('='.repeat(50));
    console.log(`\nDuration: ${duration}s`);
    console.log(`Daily Store Records: ${stats.dailyStoreRecords.toLocaleString()}`);
    console.log(`Daily Menu Records: ${stats.dailyMenuRecords.toLocaleString()}`);
    console.log(`Hourly Records: ${stats.hourlyRecords.toLocaleString()}`);

    if (stats.dateRange) {
      console.log(`Date Range: ${stats.dateRange.min} to ${stats.dateRange.max}`);
    }

    // Verify cache is valid
    const finalStats = getCacheStats();
    if (finalStats.dailyStoreRecords === 0) {
      console.error('\n❌ ERROR: Cache build produced 0 records!');
      process.exit(1);
    }

    console.log('\n✅ Cache build successful');

    closeDb();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Cache build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

buildCache();
