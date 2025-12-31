/**
 * API Route for Force Sync Specific Date
 *
 * GET /api/sync/force-date?token=xxx&date=2025-12-29
 * Forces re-sync of a specific date from MongoDB, even if already cached
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import {
  getDb as getSqliteDb,
  upsertDailyStoreMetrics,
  upsertDailyStoreMenuMetrics,
  upsertHourlyStoreMetrics,
  updateCacheMetadataBatch,
} from '@/lib/cache/sqlite';

const MAX_ORDER_VALUE = 1000000;

async function aggregateDailyStoreMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  const startDateTime = `${startDateStr} 00:00:00`;
  const endDateTime = `${endDateStr} 23:59:59`;

  const pipeline = [
    {
      $match: {
        date: {
          $gte: startDateTime,
          $lte: endDateTime,
        },
      },
    },
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
        resultPriceNum: { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
      },
    },
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
  return metrics.length;
}

async function aggregateDailyStoreMenuMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  const startDateTime = `${startDateStr} 00:00:00`;
  const endDateTime = `${endDateStr} 23:59:59`;

  const bills = await billsCollection
    .aggregate([
      {
        $match: {
          date: {
            $gte: startDateTime,
            $lte: endDateTime,
          },
        },
      },
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] },
          resultPriceNum: { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
        },
      },
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

  const menuMetrics = new Map<string, any>();

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
    } catch {
      continue;
    }
  }

  const metricsArray = Array.from(menuMetrics.values()).map((m) => ({
    ...m,
    updatedAt: new Date().toISOString(),
  }));

  upsertDailyStoreMenuMetrics(metricsArray);
  return metricsArray.length;
}

async function aggregateHourlyStoreMetrics(startDateStr: string, endDateStr: string) {
  const db = await getMongoDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');

  const startDateTime = `${startDateStr} 00:00:00`;
  const endDateTime = `${endDateStr} 23:59:59`;

  const pipeline = [
    {
      $match: {
        date: {
          $gte: startDateTime,
          $lte: endDateTime,
        },
      },
    },
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
        hourStr: { $substr: ['$date', 11, 2] },
        resultPriceNum: { $toDouble: { $ifNull: ['$resultPrice', '0'] } },
      },
    },
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
  return metrics.length;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const date = searchParams.get('date');

    // Token validation
    const expectedToken = process.env.CACHE_REFRESH_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    console.log(`[Force Sync] Starting force sync for date: ${date}`);

    // Get before stats
    const sqliteDb = getSqliteDb();
    const beforeData = sqliteDb
      .prepare(
        `SELECT COUNT(*) as count, SUM(gmv) as totalGmv, SUM(orderCount) as totalOrders
         FROM metrics_daily_store WHERE date = ?`
      )
      .get(date) as any;

    // Force sync from MongoDB
    const storeRecords = await aggregateDailyStoreMetrics(date, date);
    const menuRecords = await aggregateDailyStoreMenuMetrics(date, date);
    const hourlyRecords = await aggregateHourlyStoreMetrics(date, date);

    // Update metadata
    updateCacheMetadataBatch([date]);

    // Get after stats
    const afterData = sqliteDb
      .prepare(
        `SELECT COUNT(*) as count, SUM(gmv) as totalGmv, SUM(orderCount) as totalOrders
         FROM metrics_daily_store WHERE date = ?`
      )
      .get(date) as any;

    console.log(`[Force Sync] Completed for ${date}`);
    console.log(`[Force Sync] Before: ${JSON.stringify(beforeData)}`);
    console.log(`[Force Sync] After: ${JSON.stringify(afterData)}`);

    return NextResponse.json({
      success: true,
      date,
      before: beforeData,
      after: afterData,
      synced: {
        storeRecords,
        menuRecords,
        hourlyRecords,
      },
    });
  } catch (error: any) {
    console.error('[Force Sync] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to force sync' },
      { status: 500 }
    );
  }
}
