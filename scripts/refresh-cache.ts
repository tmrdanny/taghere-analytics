/**
 * Manually refresh cache from command line
 *
 * Usage:
 *   npx tsx scripts/refresh-cache.ts          # Smart sync (only missing dates + today)
 *   npx tsx scripts/refresh-cache.ts --full   # Full refresh (all historical data)
 *   npx tsx scripts/refresh-cache.ts --days=60  # Smart sync with 60 day lookback
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { aggregateAndCache, smartSync } from '../lib/cache/aggregation-cache';

async function refreshCache() {
  try {
    const args = process.argv.slice(2);
    const mode = args.includes('--full') ? 'full' : 'smart';
    const daysArg = args.find((arg) => arg.startsWith('--days='));
    const days = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

    console.log('=== Cache Refresh ===\n');
    console.log(`Mode: ${mode}`);
    console.log(`Lookback Days: ${days}\n`);

    if (mode === 'smart') {
      const result = await smartSync(days);

      console.log('\n=== Results ===\n');
      if (result.syncedDates.length > 0) {
        console.log(`Synced ${result.syncedDates.length} date(s):`);
        result.syncedDates.forEach(date => console.log(`  - ${date}`));
      } else {
        console.log('No missing dates found. Cache is up to date.');
      }

      console.log(`\nDaily Store Records: ${result.stats.dailyStoreRecords.toLocaleString()}`);
      console.log(`Daily Menu Records: ${result.stats.dailyMenuRecords.toLocaleString()}`);
      console.log(`Hourly Records: ${result.stats.hourlyRecords.toLocaleString()}`);

      if (result.stats.dateRange) {
        console.log(`\nDate Range: ${result.stats.dateRange.min} to ${result.stats.dateRange.max}`);
      }
    } else {
      const stats = await aggregateAndCache(mode, days);

      console.log('\n=== Results ===\n');
      console.log(`Daily Store Records: ${stats.dailyStoreRecords.toLocaleString()}`);
      console.log(`Daily Menu Records: ${stats.dailyMenuRecords.toLocaleString()}`);
      console.log(`Hourly Records: ${stats.hourlyRecords.toLocaleString()}`);

      if (stats.dateRange) {
        console.log(`\nDate Range: ${stats.dateRange.min} to ${stats.dateRange.max}`);
      }
    }

    console.log('\n✅ Cache refresh completed');

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

refreshCache();
