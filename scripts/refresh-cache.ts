/**
 * Manually refresh cache from command line
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { aggregateAndCache } from '../lib/cache/aggregation-cache';

async function refreshCache() {
  try {
    const args = process.argv.slice(2);
    const mode = args.includes('--full') ? 'full' : 'incremental';
    const daysArg = args.find((arg) => arg.startsWith('--days='));
    const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

    console.log('=== Cache Refresh ===\n');
    console.log(`Mode: ${mode}`);
    if (mode === 'incremental') {
      console.log(`Days: ${days}\n`);
    }

    const stats = await aggregateAndCache(mode, days);

    console.log('\n=== Results ===\n');
    console.log(`Daily Store Records: ${stats.dailyStoreRecords.toLocaleString()}`);
    console.log(`Daily Menu Records: ${stats.dailyMenuRecords.toLocaleString()}`);
    console.log(`Hourly Records: ${stats.hourlyRecords.toLocaleString()}`);

    if (stats.dateRange) {
      console.log(`\nDate Range: ${stats.dateRange.min} to ${stats.dateRange.max}`);
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
