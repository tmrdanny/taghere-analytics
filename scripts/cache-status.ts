/**
 * Check SQLite cache status
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getCacheStats } from '../lib/cache/sqlite';

async function checkCacheStatus() {
  try {
    console.log('=== SQLite Cache Status ===\n');

    const stats = getCacheStats();

    console.log('📊 Records:');
    console.log(`  Daily Store Metrics: ${stats.dailyStoreRecords.toLocaleString()}`);
    console.log(`  Daily Menu Metrics: ${stats.dailyMenuRecords.toLocaleString()}`);
    console.log(`  Hourly Metrics: ${stats.hourlyRecords.toLocaleString()}`);
    console.log(`  Total: ${(stats.dailyStoreRecords + stats.dailyMenuRecords + stats.hourlyRecords).toLocaleString()}\n`);

    if (stats.dateRange) {
      console.log('📅 Date Range:');
      console.log(`  From: ${stats.dateRange.min}`);
      console.log(`  To: ${stats.dateRange.max}\n`);

      const daysDiff = Math.ceil(
        (new Date(stats.dateRange.max).getTime() - new Date(stats.dateRange.min).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      console.log(`  Coverage: ${daysDiff} days\n`);
    } else {
      console.log('⚠️  No data in cache\n');
    }

    // Check file size
    const fs = require('fs');
    const dbPath = process.env.SQLITE_DB_PATH || resolve(process.cwd(), 'data/cache.db');

    if (fs.existsSync(dbPath)) {
      const stats_fs = fs.statSync(dbPath);
      const sizeMB = (stats_fs.size / 1024 / 1024).toFixed(2);
      console.log(`💾 Cache File Size: ${sizeMB} MB`);
      console.log(`📁 Location: ${dbPath}\n`);
    }

    console.log('✅ Cache status check completed');

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCacheStatus();
