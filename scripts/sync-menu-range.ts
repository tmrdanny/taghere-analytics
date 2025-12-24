/**
 * Sync menu data for a specific date range
 * Usage: npx tsx scripts/sync-menu-range.ts 2024-08-01 2025-11-30
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { getDb as getMongoDb } from '../lib/mongodb';
import { getDb as getSqliteDb, upsertDailyStoreMenuMetrics } from '../lib/cache/sqlite';
import { format, addMonths, parseISO } from 'date-fns';

async function syncMenuRange(startDateStr: string, endDateStr: string) {
  console.log(`=== Syncing Menu Data: ${startDateStr} to ${endDateStr} ===\n`);

  const startTime = Date.now();
  const sqlite = getSqliteDb();

  const mongodb = await getMongoDb();
  const billsCollection = mongodb.collection('bills');
  const storesCollection = mongodb.collection('stores');

  let currentDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);
  let totalProcessed = 0;
  let totalMenuRecords = 0;

  while (currentDate <= endDate) {
    const monthStart = format(currentDate, 'yyyy-MM-01');
    const nextMonth = addMonths(currentDate, 1);
    const monthEnd = format(new Date(Math.min(nextMonth.getTime() - 1, endDate.getTime())), 'yyyy-MM-dd');

    console.log(`Processing: ${monthStart} to ${monthEnd}`);

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
      }
    }

    const metricsArray = Array.from(menuMetrics.values());
    if (metricsArray.length > 0) {
      upsertDailyStoreMenuMetrics(metricsArray);
      totalMenuRecords += metricsArray.length;
      console.log(`  Saved ${metricsArray.length} menu metrics`);
    }

    currentDate = nextMonth;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n=== Complete ===`);
  console.log(`Bills: ${totalProcessed}, Menu records: ${totalMenuRecords}`);
  console.log(`Duration: ${duration}s`);

  // Verify
  const result = sqlite.prepare(`
    SELECT COUNT(*) as count FROM metrics_daily_store_menu
    WHERE date >= ? AND date <= ?
  `).get(startDateStr, endDateStr) as { count: number };
  console.log(`Verified: ${result.count} records in range`);

  process.exit(0);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/sync-menu-range.ts START_DATE END_DATE');
  console.log('Example: npx tsx scripts/sync-menu-range.ts 2024-08-01 2025-11-30');
  process.exit(1);
}

syncMenuRange(args[0], args[1]).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
