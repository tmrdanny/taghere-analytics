/**
 * Force sync specific date(s) from MongoDB to SQLite cache
 * OPTIMIZED: Uses index on 'date' field by matching first with string range
 * Usage: npx tsx scripts/force-sync-date.ts 2024-12-25
 */

import { getDb as getMongoDb } from '../lib/mongodb';
import {
  getDb as getSqliteDb,
  upsertDailyStoreMetrics,
  upsertDailyStoreMenuMetrics,
  upsertHourlyStoreMetrics,
  updateCacheMetadataBatch,
  getCacheStats,
} from '../lib/cache/sqlite';

const MAX_ORDER_VALUE = 1000000;

async function aggregateDailyStoreMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  console.log(`[Force Sync] Aggregating daily store metrics for ${startDateStr} to ${endDateStr}...`);

  // Create full datetime range for index-friendly matching
  // Note: date format is "YYYY-MM-DD HH:mm:ss" (space separator, not T)
  const startDateTime = `${startDateStr} 00:00:00`;
  const endDateTime = `${endDateStr} 23:59:59`;

  const pipeline = [
    // CRITICAL: $match FIRST to use index on 'date' field
    {
      $match: {
        date: {
          $gte: startDateTime,
          $lte: endDateTime,
        },
      },
    },
    // Now add computed fields only for matched documents
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
        resultPriceNum: { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
      },
    },
    // Filter out test orders
    {
      $match: {
        resultPriceNum: { $lte: MAX_ORDER_VALUE },
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
      $unwind: {
        path: '$storeInfo',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          storeId: '$storeOID',
          date: '$dateOnly',
        },
        storeName: { $first: '$storeInfo.label' },
        gmv: {
          $sum: {
            $ifNull: [{ $toDouble: { $ifNull: ['$resultPrice', '0'] } }, 0],
          },
        },
        paidAmount: {
          $sum: {
            $cond: {
              if: { $eq: [{ $ifNull: ['$storeInfo.pricingPlan.orderStd', false] }, true] },
              then: { $ifNull: [{ $toDouble: { $ifNull: ['$resultPrice', '0'] } }, 0] },
              else: 0,
            },
          },
        },
        orderCount: { $sum: 1 },
      },
    },
    {
      $project: {
        storeId: '$_id.storeId',
        storeName: { $ifNull: ['$storeName', 'Unknown Store'] },
        date: '$_id.date',
        gmv: '$gmv',
        paidAmount: '$paidAmount',
        orderCount: '$orderCount',
        successfulPayments: '$orderCount',
        failedPayments: { $literal: 0 },
        avgOrderValue: { $divide: ['$gmv', '$orderCount'] },
        paymentSuccessRate: { $literal: 1.0 },
        updatedAt: { $literal: new Date().toISOString() },
      },
    },
  ];

  const results = await billsCollection.aggregate(pipeline).toArray();
  const metrics = results.map((r: any) => ({
    ...r,
    storeId: r.storeId.toString(),
  }));

  upsertDailyStoreMetrics(metrics);
  console.log(`[Force Sync] Aggregated ${metrics.length} daily store records`);
}

async function aggregateDailyStoreMenuMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  console.log(`[Force Sync] Aggregating daily store-menu metrics for ${startDateStr} to ${endDateStr}...`);

  // Create full datetime range for index-friendly matching
  // Note: date format is "YYYY-MM-DD HH:mm:ss" (space separator, not T)
  const startDateTime = `${startDateStr} 00:00:00`;
  const endDateTime = `${endDateStr} 23:59:59`;

  const bills = await billsCollection
    .aggregate([
      // CRITICAL: $match FIRST to use index on 'date' field
      {
        $match: {
          date: {
            $gte: startDateTime,
            $lte: endDateTime,
          },
        },
      },
      // Now add computed fields only for matched documents
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] },
          resultPriceNum: { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
        },
      },
      // Filter out test orders
      {
        $match: {
          resultPriceNum: { $lte: MAX_ORDER_VALUE },
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
    ])
    .toArray();

  console.log(`[Force Sync] Fetched ${bills.length} bills for menu aggregation`);

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
        const price = parseFloat(item.price) || 0;
        const count = parseInt(item.count) || 0;

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

  console.log(`[Force Sync] Parsed ${menuMetrics.size} unique menu metrics (${parseErrors} parse errors)`);

  const metricsArray = Array.from(menuMetrics.values()).map((m) => ({
    ...m,
    updatedAt: new Date().toISOString(),
  }));

  upsertDailyStoreMenuMetrics(metricsArray);
  console.log(`[Force Sync] Upserted ${metricsArray.length} menu metrics to SQLite`);
}

async function aggregateHourlyStoreMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');

  console.log(`[Force Sync] Aggregating hourly store metrics for ${startDateStr} to ${endDateStr}...`);

  // Create full datetime range for index-friendly matching
  // Note: date format is "YYYY-MM-DD HH:mm:ss" (space separator, not T)
  const startDateTime = `${startDateStr} 00:00:00`;
  const endDateTime = `${endDateStr} 23:59:59`;

  const pipeline = [
    // CRITICAL: $match FIRST to use index on 'date' field
    {
      $match: {
        date: {
          $gte: startDateTime,
          $lte: endDateTime,
        },
      },
    },
    // Now add computed fields only for matched documents
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
        hourStr: { $substr: ['$date', 11, 2] },
        resultPriceNum: { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
      },
    },
    // Filter out test orders
    {
      $match: {
        resultPriceNum: { $lte: MAX_ORDER_VALUE },
      },
    },
    {
      $group: {
        _id: {
          storeId: '$storeOID',
          datetime: {
            $concat: ['$dateOnly', 'T', '$hourStr', ':00:00.000Z'],
          },
        },
        gmv: {
          $sum: {
            $ifNull: [{ $toDouble: { $ifNull: ['$resultPrice', '0'] } }, 0],
          },
        },
        orderCount: { $sum: 1 },
      },
    },
    {
      $project: {
        storeId: '$_id.storeId',
        datetime: '$_id.datetime',
        hour: { $toInt: { $substr: ['$_id.datetime', 11, 2] } },
        dayOfWeek: { $literal: 0 },
        gmv: '$gmv',
        orderCount: '$orderCount',
        updatedAt: { $literal: new Date().toISOString() },
      },
    },
  ];

  const results = await billsCollection.aggregate(pipeline).toArray();

  const metrics = results.map((r: any) => {
    const datetime = new Date(r.datetime);
    return {
      ...r,
      storeId: r.storeId.toString(),
      dayOfWeek: datetime.getDay() + 1,
    };
  });

  upsertHourlyStoreMetrics(metrics);
  console.log(`[Force Sync] Aggregated ${metrics.length} hourly store records`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/force-sync-date.ts <date>');
    console.log('Example: npx tsx scripts/force-sync-date.ts 2024-12-25');
    process.exit(1);
  }

  const dateToSync = args[0];
  console.log(`\n========================================`);
  console.log(`[Force Sync] 날짜: ${dateToSync}`);
  console.log(`========================================\n`);

  // Get before stats
  const sqliteDb = getSqliteDb();
  const beforeData = sqliteDb
    .prepare(
      `
    SELECT COUNT(*) as count, SUM(gmv) as totalGmv, SUM(orderCount) as totalOrders
    FROM metrics_daily_store
    WHERE date = ?
  `
    )
    .get(dateToSync) as any;
  console.log('[Before] 기존 데이터:', beforeData);

  // Sync from MongoDB
  console.log('\n[Sync] MongoDB에서 데이터 가져오는 중...\n');

  await aggregateDailyStoreMetrics(dateToSync, dateToSync);
  await aggregateDailyStoreMenuMetrics(dateToSync, dateToSync);
  await aggregateHourlyStoreMetrics(dateToSync, dateToSync);

  // Update metadata
  updateCacheMetadataBatch([dateToSync]);

  // Get after stats
  const afterData = sqliteDb
    .prepare(
      `
    SELECT COUNT(*) as count, SUM(gmv) as totalGmv, SUM(orderCount) as totalOrders
    FROM metrics_daily_store
    WHERE date = ?
  `
    )
    .get(dateToSync) as any;

  console.log('\n========================================');
  console.log('[After] 동기화 후 데이터:', afterData);
  console.log('========================================');

  const overallStats = getCacheStats();
  console.log('\n[Overall] 전체 캐시 상태:', overallStats);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
