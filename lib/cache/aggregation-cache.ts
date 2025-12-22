/**
 * Aggregation caching layer
 * Aggregates MongoDB data and caches in SQLite for fast queries
 */

import { getDb as getMongoDb } from '../mongodb';
import {
  getDb as getSqliteDb,
  upsertDailyStoreMetrics,
  upsertDailyStoreMenuMetrics,
  upsertHourlyStoreMetrics,
  queryDailyStoreMetrics,
  queryDailyStoreMenuMetrics,
  getCacheStats,
} from './sqlite';
import { MetricsFilter, DashboardKPI } from '../types/metrics';
import { format, subDays } from 'date-fns';

/**
 * Aggregate from MongoDB and cache in SQLite
 */
export async function aggregateAndCache(mode: 'full' | 'incremental' = 'incremental', days = 7) {
  console.log(`[Cache] Starting aggregation (mode: ${mode}, days: ${days})`);

  const startTime = Date.now();

  // Determine date range
  let startDate: Date;
  const endDate = new Date();

  if (mode === 'full') {
    // Full aggregation: limit to 90 days for memory efficiency on free tier
    // For serverless/free plans, we can't load all historical data
    const fullDays = parseInt(process.env.CACHE_FULL_DAYS || '90', 10);
    startDate = subDays(endDate, fullDays);
    console.log(`[Cache] Full mode limited to ${fullDays} days for memory efficiency`);
  } else {
    // Incremental: last N days
    startDate = subDays(endDate, days);
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  console.log(`[Cache] Date range: ${startDateStr} to ${endDateStr}`);

  // Aggregate daily store metrics
  await aggregateDailyStoreMetrics(startDateStr, endDateStr);

  // Aggregate daily store-menu metrics (with fixed JSON parsing)
  await aggregateDailyStoreMenuMetrics(startDateStr, endDateStr);

  // Aggregate hourly store metrics
  await aggregateHourlyStoreMetrics(startDateStr, endDateStr);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Cache] Aggregation completed in ${duration}s`);

  // Return stats
  return getCacheStats();
}

/**
 * Aggregate daily store metrics from MongoDB
 */
async function aggregateDailyStoreMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  console.log(`[Cache] Aggregating daily store metrics...`);

  const pipeline = [
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
      },
    },
    {
      $match: {
        dateOnly: {
          $gte: startDateStr,
          $lte: endDateStr,
        },
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
            $ifNull: [
              { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
              0
            ]
          }
        },
        paidAmount: {
          $sum: {
            $cond: {
              if: { $eq: [{ $ifNull: ['$storeInfo.pricingPlan.orderStd', false] }, true] },
              then: {
                $ifNull: [
                  { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
                  0
                ]
              },
              else: 0
            }
          }
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

  // Convert ObjectId to string for SQLite
  const metrics = results.map((r: any) => ({
    ...r,
    storeId: r.storeId.toString(),
  }));

  upsertDailyStoreMetrics(metrics);

  console.log(`[Cache] Aggregated ${metrics.length} daily store records`);
}

/**
 * Aggregate daily store-menu metrics from MongoDB
 */
async function aggregateDailyStoreMenuMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  console.log(`[Cache] Aggregating daily store-menu metrics (${startDateStr} to ${endDateStr})`);

  // Step 1: Fetch bills with store info
  const bills = await billsCollection.aggregate([
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
      },
    },
    {
      $match: {
        dateOnly: { $gte: startDateStr, $lte: endDateStr },
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

  console.log(`[Cache] Fetched ${bills.length} bills for menu aggregation`);

  // Step 2: Parse JSON and aggregate in JavaScript
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

  console.log(`[Cache] Parsed ${menuMetrics.size} unique menu metrics (${parseErrors} parse errors)`);

  // Step 3: Upsert to SQLite
  const metricsArray = Array.from(menuMetrics.values()).map(m => ({
    ...m,
    updatedAt: new Date().toISOString(),
  }));

  upsertDailyStoreMenuMetrics(metricsArray);
  console.log(`[Cache] Upserted ${metricsArray.length} menu metrics to SQLite`);
}

/**
 * Aggregate hourly store metrics from MongoDB
 */
async function aggregateHourlyStoreMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');

  console.log(`[Cache] Aggregating hourly store metrics...`);

  const pipeline = [
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
        hourStr: { $substr: ['$date', 11, 2] },
      },
    },
    {
      $match: {
        dateOnly: {
          $gte: startDateStr,
          $lte: endDateStr,
        },
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
            $ifNull: [
              { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
              0
            ]
          }
        },
        orderCount: { $sum: 1 },
      },
    },
    {
      $project: {
        storeId: '$_id.storeId',
        datetime: '$_id.datetime',
        hour: { $toInt: { $substr: ['$_id.datetime', 11, 2] } },
        dayOfWeek: { $literal: 0 }, // Will calculate on insert
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
      dayOfWeek: datetime.getDay() + 1, // 1=Sunday, 7=Saturday
    };
  });

  upsertHourlyStoreMetrics(metrics);

  console.log(`[Cache] Aggregated ${metrics.length} hourly store records`);
}

/**
 * Get dashboard KPIs from SQLite cache
 * If cache is empty, triggers aggregation
 */
export async function getCachedDashboardKPIs(filter: MetricsFilter): Promise<DashboardKPI> {
  const startDateStr = format(filter.startDate, 'yyyy-MM-dd');
  const endDateStr = format(filter.endDate, 'yyyy-MM-dd');

  // Check if cache has data
  const stats = getCacheStats();

  if (!stats.dateRange || stats.dailyStoreRecords === 0) {
    console.log('[Cache] No cached data, triggering full aggregation...');

    const autoRefresh = process.env.CACHE_AUTO_REFRESH !== 'false';

    if (autoRefresh) {
      await aggregateAndCache('full');
    } else {
      throw new Error(
        'Cache is empty. Please run aggregation first: POST /api/refresh-cache'
      );
    }
  }

  // Query from SQLite
  const storeIdsStr = filter.storeIds?.map(String);

  const dailyMetrics = queryDailyStoreMetrics(startDateStr, endDateStr, storeIdsStr);
  // Skip menu metrics for now (performance optimization)
  const menuMetrics: any[] = [];

  // Calculate aggregated KPIs
  const totalGMV = dailyMetrics.reduce((sum: number, m: any) => sum + m.gmv, 0);
  const totalPaidAmount = dailyMetrics.reduce((sum: number, m: any) => sum + m.paidAmount, 0);
  const totalOrders = dailyMetrics.reduce((sum: number, m: any) => sum + m.orderCount, 0);
  const avgOrderValue = totalOrders > 0 ? totalGMV / totalOrders : 0;

  // Get unique stores
  const uniqueStores = new Set(dailyMetrics.map((m: any) => m.storeId));
  const activeStores = uniqueStores.size;

  // Group daily metrics by date
  const dailyByDate: Record<string, { date: string; gmv: number; paidAmount: number; orders: number }> = dailyMetrics.reduce((acc: Record<string, { date: string; gmv: number; paidAmount: number; orders: number }>, m: any) => {
    if (!acc[m.date]) {
      acc[m.date] = { date: m.date, gmv: 0, paidAmount: 0, orders: 0 };
    }
    acc[m.date].gmv += m.gmv;
    acc[m.date].paidAmount += m.paidAmount;
    acc[m.date].orders += m.orderCount;
    return acc;
  }, {});

  const dailyTimeSeries = Object.values(dailyByDate);

  // Top stores by GMV
  const storeGMV: Record<string, { storeId: string; storeName: string; gmv: number; orders: number }> = dailyMetrics.reduce((acc: Record<string, { storeId: string; storeName: string; gmv: number; orders: number }>, m: any) => {
    if (!acc[m.storeId]) {
      acc[m.storeId] = { storeId: m.storeId, storeName: m.storeName, gmv: 0, orders: 0 };
    }
    acc[m.storeId].gmv += m.gmv;
    acc[m.storeId].orders += m.orderCount;
    return acc;
  }, {});

  const topStoresByGMV = Object.values(storeGMV)
    .sort((a: any, b: any) => b.gmv - a.gmv)
    .slice(0, filter.limit || 10);

  // Top menus by quantity
  const menuSales: Record<string, { menuId: string; menuName: string; quantity: number; revenue: number }> = menuMetrics.reduce((acc: Record<string, { menuId: string; menuName: string; quantity: number; revenue: number }>, m: any) => {
    const key = m.menuId;
    if (!acc[key]) {
      acc[key] = { menuId: m.menuId, menuName: m.menuName, quantity: 0, revenue: 0 };
    }
    acc[key].quantity += m.quantity;
    acc[key].revenue += m.revenue;
    return acc;
  }, {});

  const topMenusByQuantity = Object.values(menuSales)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, filter.limit || 10);

  const topMenusByRevenue = Object.values(menuSales)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, filter.limit || 10);

  return {
    totalGMV,
    totalPaidAmount,
    totalOrders,
    avgOrderValue,
    activeStores,
    paymentSuccessRate: 1.0,
    dailyMetrics: dailyTimeSeries as any,
    topStoresByGMV: topStoresByGMV as any,
    topMenusByQuantity: topMenusByQuantity as any,
    topMenusByRevenue: topMenusByRevenue as any,
  };
}
