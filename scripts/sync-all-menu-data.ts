/**
 * Sync all menu data from MongoDB to SQLite cache
 * This script fetches all historical menu data and stores it in SQLite
 *
 * Usage: npx tsx scripts/sync-all-menu-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { getDb as getMongoDb } from '../lib/mongodb';
import { getDb as getSqliteDb, upsertDailyStoreMenuMetrics } from '../lib/cache/sqlite';
import { format, subMonths } from 'date-fns';

async function syncAllMenuData() {
  console.log('=== Starting Full Menu Data Sync ===\n');

  const startTime = Date.now();

  // Get date range from daily store metrics (we want menu data for the same period)
  const sqlite = getSqliteDb();
  const dateRange = sqlite.prepare(`
    SELECT MIN(date) as minDate, MAX(date) as maxDate
    FROM metrics_daily_store
  `).get() as { minDate: string; maxDate: string };

  const startDateStr = dateRange.minDate || format(subMonths(new Date(), 12), 'yyyy-MM-dd');
  const endDateStr = dateRange.maxDate || format(new Date(), 'yyyy-MM-dd');

  console.log(`Date range: ${startDateStr} to ${endDateStr}`);

  // Process in monthly batches to avoid memory issues
  const mongodb = await getMongoDb();
  const billsCollection = mongodb.collection('bills');
  const storesCollection = mongodb.collection('stores');

  // Get all months in range
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  let currentDate = new Date(startDate);
  let totalProcessed = 0;
  let totalMenuRecords = 0;

  while (currentDate <= endDate) {
    const monthStart = format(currentDate, 'yyyy-MM-01');
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = format(new Date(nextMonth.getTime() - 1), 'yyyy-MM-dd');

    console.log(`\nProcessing month: ${monthStart} to ${monthEnd}`);

    // Fetch bills for this month
    const bills = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] },
        },
      },
      {
        $match: {
          dateOnly: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $lookup: {
          from: storesCollection.collectionName,
          localField: 'storeOID',
          foreignField: '_id',
          as: 'storeInfo',
        },
      },
      {
        $project: {
          storeOID: 1,
          storeName: { $arrayElemAt: ['$storeInfo.label', 0] },
          items: 1,
          dateOnly: 1,
        },
      },
    ]).toArray();

    console.log(`  Fetched ${bills.length} bills`);
    totalProcessed += bills.length;

    // Parse and aggregate menu data
    const menuMetrics = new Map<string, any>();
    let parseErrors = 0;

    for (const bill of bills) {
      try {
        const items = JSON.parse(bill.items);
        if (!Array.isArray(items)) continue;

        const storeId = bill.storeOID.toString();
        const storeName = bill.storeName || 'Unknown Store';
        const date = bill.dateOnly;

        for (const item of items) {
          const menuLabel = item.label;
          if (!menuLabel) continue;

          const price = parseFloat(item.price) || 0;
          const count = parseInt(item.count) || 1;

          const key = `${storeId}_${menuLabel}_${date}`;

          if (!menuMetrics.has(key)) {
            menuMetrics.set(key, {
              storeId,
              storeName,
              menuId: menuLabel,
              menuName: menuLabel,
              date,
              quantity: 0,
              revenue: 0,
              orderCount: 0,
              updatedAt: new Date().toISOString(),
            });
          }

          const metric = menuMetrics.get(key);
          metric.quantity += count;
          metric.revenue += price * count;
          metric.orderCount += 1;
        }
      } catch (e) {
        parseErrors++;
        continue;
      }
    }

    // Save to SQLite
    const metricsArray = Array.from(menuMetrics.values());
    if (metricsArray.length > 0) {
      upsertDailyStoreMenuMetrics(metricsArray);
      totalMenuRecords += metricsArray.length;
      console.log(`  Saved ${metricsArray.length} menu metrics (${parseErrors} parse errors)`);
    } else {
      console.log(`  No menu data for this month`);
    }

    // Move to next month
    currentDate = nextMonth;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n=== Sync Complete ===');
  console.log(`Total bills processed: ${totalProcessed}`);
  console.log(`Total menu records saved: ${totalMenuRecords}`);
  console.log(`Duration: ${duration}s`);

  // Verify
  const menuCount = sqlite.prepare('SELECT COUNT(*) as count FROM metrics_daily_store_menu').get() as { count: number };
  const menuDateRange = sqlite.prepare('SELECT MIN(date) as min, MAX(date) as max FROM metrics_daily_store_menu').get() as { min: string; max: string };

  console.log(`\nSQLite menu cache:`);
  console.log(`  Total records: ${menuCount.count}`);
  console.log(`  Date range: ${menuDateRange.min} to ${menuDateRange.max}`);

  process.exit(0);
}

syncAllMenuData().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
