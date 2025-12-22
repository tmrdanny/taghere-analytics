/**
 * Batch aggregation script
 * Run this via: npm run aggregate
 *
 * This script aggregates raw operational data into pre-computed metrics collections
 * Should be run on a schedule (cron, GitHub Actions, Cloud Scheduler, etc.)
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { runIncrementalAggregation, createMetricsIndexes } from '../lib/aggregation/pipeline';
import { subDays, startOfDay, endOfDay } from 'date-fns';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

/**
 * Source collection names (configure based on actual schema)
 */

const SOURCE_COLLECTIONS = {
  orders: process.env.COLLECTION_ORDERS || 'orders',
  payments: process.env.COLLECTION_PAYMENTS || 'payments',
  menus: process.env.COLLECTION_MENUS || 'menus',
};

async function runAggregation() {
  try {
    // Get incremental days from env (default 7)
    const incrementalDays = parseInt(process.env.BATCH_INCREMENTAL_DAYS || '7', 10);

    // Calculate date range (re-aggregate last N days)
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, incrementalDays));

    console.log('=== Batch Aggregation Started ===');
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Incremental days: ${incrementalDays}`);
    console.log(`Source collections:`, SOURCE_COLLECTIONS);
    console.log('');

    const result = await runIncrementalAggregation(
      startDate,
      endDate,
      SOURCE_COLLECTIONS
    );

    if (result.success) {
      console.log('');
      console.log('=== Aggregation Completed Successfully ===');
      console.log(`Total records processed: ${result.recordsProcessed}`);
      process.exit(0);
    } else {
      console.error('');
      console.error('=== Aggregation Failed ===');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

async function setupIndexes() {
  try {
    console.log('=== Setting up metrics indexes ===');
    await createMetricsIndexes();
    console.log('=== Indexes created successfully ===');
    process.exit(0);
  } catch (error: any) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

// Main execution
(async () => {
  switch (command) {
    case 'setup-indexes':
      await setupIndexes();
      break;
    case 'run':
    default:
      await runAggregation();
      break;
  }
})();
