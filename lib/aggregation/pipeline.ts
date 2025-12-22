/**
 * Aggregation pipeline for pre-computing metrics
 * This module aggregates raw operational data into metrics collections
 *
 * IMPORTANT: This module should be run as a batch job (cron/scheduled task)
 * NOT called directly from API endpoints to avoid hitting operational collections
 */

import { Db } from 'mongodb';
import { getDb } from '../mongodb';

/**
 * Configuration for source collections
 * These will be discovered from the actual schema
 */
interface SourceCollections {
  orders: string; // e.g., 'orders'
  payments: string; // e.g., 'payments'
  menus: string; // e.g., 'menus'
}

/**
 * Aggregate daily store metrics from raw bills
 *
 * Actual schema:
 * - bills: { _id, storeOID (ObjectId), date (string), resultPrice (string), items (JSON string), type }
 * - stores: { _id, label, name, location, phone }
 */
export async function aggregateDailyStoreMetrics(
  startDate: Date,
  endDate: Date,
  sourceCollections: SourceCollections
): Promise<number> {
  const db = await getDb();

  console.log(
    `[Aggregation] Daily Store Metrics: ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  // Convert dates to string format matching the schema (YYYY-MM-DD HH:mm:ss)
  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  // Build aggregation pipeline
  const pipeline = [
    // Match bills within date range (date is string format)
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] }, // Extract YYYY-MM-DD from "YYYY-MM-DD HH:mm:ss"
      },
    },
    {
      $match: {
        dateOnly: {
          $gte: startDateStr,
          $lt: endDateStr,
        },
      },
    },

    // Lookup store info
    {
      $lookup: {
        from: sourceCollections.menus, // stores collection
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

    // Group by store and date
    {
      $group: {
        _id: {
          storeId: '$storeOID',
          date: '$dateOnly',
        },
        storeName: { $first: '$storeInfo.label' },
        gmv: { $sum: { $toDouble: '$resultPrice' } }, // Convert string to number
        paidAmount: { $sum: { $toDouble: '$resultPrice' } }, // Same as GMV for bills
        orderCount: { $sum: 1 },
      },
    },

    // Project final shape
    {
      $project: {
        _id: 0,
        storeId: '$_id.storeId',
        storeName: { $ifNull: ['$storeName', 'Unknown Store'] },
        date: {
          $dateFromString: {
            dateString: '$_id.date',
          },
        },
        gmv: 1,
        paidAmount: 1,
        orderCount: 1,
        successfulPayments: '$orderCount', // All bills are assumed successful
        failedPayments: 0,
        avgOrderValue: { $divide: ['$gmv', '$orderCount'] },
        paymentSuccessRate: 1.0, // 100% success rate for bills
        updatedAt: new Date(),
      },
    },

    // Merge into metrics collection (upsert)
    {
      $merge: {
        into: 'metrics_daily_store',
        on: ['storeId', 'date'],
        whenMatched: 'replace',
        whenNotMatched: 'insert',
      },
    },
  ];

  const billsCollection = db.collection(sourceCollections.orders);

  // Execute aggregation
  const cursor = billsCollection.aggregate(pipeline);
  let count = 0;

  await cursor.forEach(() => {
    count++;
  });

  console.log(`[Aggregation] Processed ${count} daily store metrics`);
  return count;
}

/**
 * Aggregate daily store-menu metrics
 * items field is a JSON string: '[{"label":"아이스 아메리카노","price":"3500","count":1}]'
 */
export async function aggregateDailyStoreMenuMetrics(
  startDate: Date,
  endDate: Date,
  sourceCollections: SourceCollections
): Promise<number> {
  const db = await getDb();

  console.log(
    `[Aggregation] Daily Store-Menu Metrics: ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const pipeline = [
    // Match bills within date range
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
      },
    },
    {
      $match: {
        dateOnly: {
          $gte: startDateStr,
          $lt: endDateStr,
        },
      },
    },

    // Lookup store info
    {
      $lookup: {
        from: sourceCollections.menus, // stores collection
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

    // Parse JSON items string and unwind
    {
      $addFields: {
        parsedItems: {
          $cond: {
            if: { $eq: [{ $type: '$items' }, 'string'] },
            then: { $map: {
              input: { $range: [0, 1] }, // Placeholder to parse JSON (MongoDB doesn't have native JSON parse in aggregation)
              as: 'dummy',
              in: '$items'
            }},
            else: []
          }
        }
      }
    },

    // Group by store, menu label, and date
    {
      $group: {
        _id: {
          storeId: '$storeOID',
          items: '$items', // Use raw items string as unique identifier
          date: '$dateOnly',
        },
        storeName: { $first: '$storeInfo.label' },
        itemsData: { $first: '$items' },
        orderCount: { $sum: 1 },
        revenue: { $sum: { $toDouble: '$resultPrice' } },
      },
    },

    // Project final shape
    {
      $project: {
        _id: 0,
        storeId: '$_id.storeId',
        storeName: { $ifNull: ['$storeName', 'Unknown Store'] },
        menuId: '$_id.items', // Use items string as menuId temporarily
        menuName: '$_id.items', // Will show items JSON
        date: {
          $dateFromString: {
            dateString: '$_id.date',
          },
        },
        quantity: '$orderCount',
        revenue: 1,
        orderCount: 1,
        updatedAt: new Date(),
      },
    },

    // Merge into metrics collection
    {
      $merge: {
        into: 'metrics_daily_store_menu',
        on: ['storeId', 'menuId', 'date'],
        whenMatched: 'replace',
        whenNotMatched: 'insert',
      },
    },
  ];

  const billsCollection = db.collection(sourceCollections.orders);
  const cursor = billsCollection.aggregate(pipeline);
  let count = 0;

  await cursor.forEach(() => {
    count++;
  });

  console.log(`[Aggregation] Processed ${count} daily store-menu metrics`);
  return count;
}

/**
 * Aggregate hourly store metrics (for heatmap)
 * date field is string: "2023-03-24 17:36:13"
 */
export async function aggregateHourlyStoreMetrics(
  startDate: Date,
  endDate: Date,
  sourceCollections: SourceCollections
): Promise<number> {
  const db = await getDb();

  console.log(
    `[Aggregation] Hourly Store Metrics: ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const pipeline = [
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] },
        hourStr: { $substr: ['$date', 11, 2] }, // Extract hour from "YYYY-MM-DD HH:mm:ss"
      },
    },
    {
      $match: {
        dateOnly: {
          $gte: startDateStr,
          $lt: endDateStr,
        },
      },
    },

    {
      $group: {
        _id: {
          storeId: '$storeOID',
          datetime: {
            $concat: ['$dateOnly', 'T', '$hourStr', ':00:00.000Z']
          },
        },
        gmv: { $sum: { $toDouble: '$resultPrice' } },
        orderCount: { $sum: 1 },
      },
    },

    {
      $project: {
        _id: 0,
        storeId: '$_id.storeId',
        datetime: {
          $dateFromString: {
            dateString: '$_id.datetime',
          },
        },
        hour: { $toInt: { $substr: ['$_id.datetime', 11, 2] } },
        dayOfWeek: {
          $dayOfWeek: { $dateFromString: { dateString: '$_id.datetime' } },
        },
        gmv: 1,
        orderCount: 1,
        updatedAt: new Date(),
      },
    },

    {
      $merge: {
        into: 'metrics_hourly_store',
        on: ['storeId', 'datetime'],
        whenMatched: 'replace',
        whenNotMatched: 'insert',
      },
    },
  ];

  const billsCollection = db.collection(sourceCollections.orders);
  const cursor = billsCollection.aggregate(pipeline);
  let count = 0;

  await cursor.forEach(() => {
    count++;
  });

  console.log(`[Aggregation] Processed ${count} hourly store metrics`);
  return count;
}

/**
 * Run all aggregations for a date range (incremental update)
 */
export async function runIncrementalAggregation(
  startDate: Date,
  endDate: Date,
  sourceCollections: SourceCollections
): Promise<{ success: boolean; recordsProcessed: number; error?: string }> {
  try {
    console.log(`[Aggregation] Starting incremental aggregation`);
    console.log(`  Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`  Source collections:`, sourceCollections);

    let totalRecords = 0;

    // Run aggregations in sequence
    totalRecords += await aggregateDailyStoreMetrics(
      startDate,
      endDate,
      sourceCollections
    );

    totalRecords += await aggregateDailyStoreMenuMetrics(
      startDate,
      endDate,
      sourceCollections
    );

    totalRecords += await aggregateHourlyStoreMetrics(
      startDate,
      endDate,
      sourceCollections
    );

    console.log(`[Aggregation] Completed: ${totalRecords} total records processed`);

    return {
      success: true,
      recordsProcessed: totalRecords,
    };
  } catch (error: any) {
    console.error('[Aggregation] Error:', error);
    return {
      success: false,
      recordsProcessed: 0,
      error: error.message,
    };
  }
}

/**
 * Create indexes for metrics collections
 * Should be run once during setup
 */
export async function createMetricsIndexes(): Promise<void> {
  const db = await getDb();

  console.log('[Indexes] Creating metrics collection indexes...');

  // metrics_daily_store indexes
  await db
    .collection('metrics_daily_store')
    .createIndex({ storeId: 1, date: 1 }, { unique: true });
  await db.collection('metrics_daily_store').createIndex({ date: 1 });
  await db.collection('metrics_daily_store').createIndex({ storeId: 1 });

  // metrics_daily_store_menu indexes
  await db
    .collection('metrics_daily_store_menu')
    .createIndex({ storeId: 1, menuId: 1, date: 1 }, { unique: true });
  await db.collection('metrics_daily_store_menu').createIndex({ date: 1 });
  await db.collection('metrics_daily_store_menu').createIndex({ storeId: 1 });

  // metrics_hourly_store indexes
  await db
    .collection('metrics_hourly_store')
    .createIndex({ storeId: 1, datetime: 1 }, { unique: true });
  await db.collection('metrics_hourly_store').createIndex({ datetime: 1 });

  console.log('[Indexes] Indexes created successfully');
}
