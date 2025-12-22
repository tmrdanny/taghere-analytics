/**
 * Real-time dashboard queries (Read-only)
 *
 * This module queries DIRECTLY from bills/stores collections
 * WITHOUT pre-aggregated metrics collections.
 *
 * Uses read-only certificate - NO WRITE operations.
 * Aggregation results are computed in-memory and returned directly.
 */

import { getReadOnlyDb } from '../mongodb';
import { MetricsFilter, DashboardKPI } from '../types/metrics';

/**
 * Validate and limit date range to prevent excessive queries
 */
function validateDateRange(startDate: Date, endDate: Date): void {
  const maxDays = parseInt(process.env.MAX_DATE_RANGE_DAYS || '730', 10);
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff > maxDays) {
    throw new Error(
      `Date range exceeds maximum of ${maxDays} days. Requested: ${daysDiff} days`
    );
  }

  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }
}

/**
 * Get dashboard KPIs by aggregating directly from bills collection
 * Read-only operation - no data is written
 */
export async function getRealtimeDashboardKPIs(
  filter: MetricsFilter
): Promise<DashboardKPI> {
  validateDateRange(filter.startDate, filter.endDate);

  const db = await getReadOnlyDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');
  const storesCollection = db.collection(process.env.COLLECTION_MENUS || 'stores');

  // Convert dates to string format matching schema
  const startDateStr = filter.startDate.toISOString().slice(0, 10);
  const endDateStr = filter.endDate.toISOString().slice(0, 10);

  // Build match filter
  const matchFilter: any = {
    $expr: {
      $and: [
        {
          $gte: [
            { $substr: ['$date', 0, 10] },
            startDateStr
          ]
        },
        {
          $lte: [
            { $substr: ['$date', 0, 10] },
            endDateStr
          ]
        }
      ]
    }
  };

  if (filter.storeIds && filter.storeIds.length > 0) {
    matchFilter.storeOID = { $in: filter.storeIds };
  }

  // Query 1: Get total metrics
  const totalMetrics = await billsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: storesCollection.collectionName,
          localField: 'storeOID',
          foreignField: '_id',
          as: 'storeInfo',
        },
      },
      {
        $group: {
          _id: null,
          totalGMV: { $sum: { $toDouble: '$resultPrice' } },
          totalPaidAmount: { $sum: { $toDouble: '$resultPrice' } },
          totalOrders: { $sum: 1 },
          activeStores: { $addToSet: '$storeOID' },
        },
      },
      {
        $project: {
          totalGMV: 1,
          totalPaidAmount: 1,
          totalOrders: 1,
          totalSuccessfulPayments: '$totalOrders', // All bills are successful
          totalFailedPayments: { $literal: 0 },
          activeStoresCount: { $size: '$activeStores' },
        },
      },
    ])
    .toArray();

  const totals = totalMetrics[0] || {
    totalGMV: 0,
    totalPaidAmount: 0,
    totalOrders: 0,
    totalSuccessfulPayments: 0,
    totalFailedPayments: 0,
    activeStoresCount: 0,
  };

  // Calculate derived metrics
  const avgOrderValue =
    totals.totalOrders > 0 ? totals.totalGMV / totals.totalOrders : 0;

  const paymentSuccessRate = 1.0; // 100% for bills

  // Query 2: Get daily time series
  const dailyMetrics = await billsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] },
        },
      },
      {
        $group: {
          _id: '$dateOnly',
          gmv: { $sum: { $toDouble: '$resultPrice' } },
          paidAmount: { $sum: { $toDouble: '$resultPrice' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          gmv: 1,
          paidAmount: 1,
          orders: 1,
        },
      },
    ])
    .toArray();

  // Query 3: Top stores by GMV
  const topStoresByGMV = await billsCollection
    .aggregate([
      { $match: matchFilter },
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
          _id: '$storeOID',
          storeName: { $first: '$storeInfo.label' },
          gmv: { $sum: { $toDouble: '$resultPrice' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { gmv: -1 } },
      { $limit: filter.limit || 10 },
      {
        $project: {
          storeId: '$_id',
          storeName: { $ifNull: ['$storeName', 'Unknown Store'] },
          gmv: 1,
          orders: 1,
        },
      },
    ])
    .toArray();

  // Query 4: Top menus by quantity (items field is JSON string)
  const topMenusByQuantity = await billsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$items', // Group by unique items combination
          quantity: { $sum: 1 }, // Count orders with this combination
          revenue: { $sum: { $toDouble: '$resultPrice' } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: filter.limit || 10 },
      {
        $project: {
          menuId: '$_id',
          menuName: '$_id', // Display items JSON as name
          quantity: 1,
          revenue: 1,
        },
      },
    ])
    .toArray();

  // Query 5: Top menus by revenue
  const topMenusByRevenue = await billsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$items',
          revenue: { $sum: { $toDouble: '$resultPrice' } },
          quantity: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: filter.limit || 10 },
      {
        $project: {
          menuId: '$_id',
          menuName: '$_id',
          revenue: 1,
          quantity: 1,
        },
      },
    ])
    .toArray();

  return {
    totalGMV: totals.totalGMV,
    totalPaidAmount: totals.totalPaidAmount,
    totalOrders: totals.totalOrders,
    avgOrderValue,
    activeStores: totals.activeStoresCount,
    paymentSuccessRate,
    dailyMetrics: dailyMetrics as any,
    topStoresByGMV: topStoresByGMV as any,
    topMenusByQuantity: topMenusByQuantity as any,
    topMenusByRevenue: topMenusByRevenue as any,
  };
}

/**
 * Get metrics for a specific store (real-time)
 */
export async function getRealtimeStoreMetrics(
  storeId: string,
  startDate: Date,
  endDate: Date
) {
  validateDateRange(startDate, endDate);

  const db = await getReadOnlyDb();
  const billsCollection = db.collection(process.env.COLLECTION_ORDERS || 'bills');

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const matchFilter = {
    storeOID: storeId,
    $expr: {
      $and: [
        { $gte: [{ $substr: ['$date', 0, 10] }, startDateStr] },
        { $lte: [{ $substr: ['$date', 0, 10] }, endDateStr] },
      ],
    },
  };

  // Get daily metrics
  const dailyMetrics = await billsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] },
        },
      },
      {
        $group: {
          _id: '$dateOnly',
          gmv: { $sum: { $toDouble: '$resultPrice' } },
          paidAmount: { $sum: { $toDouble: '$resultPrice' } },
          orderCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          avgOrderValue: { $divide: ['$gmv', '$orderCount'] },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          gmv: 1,
          paidAmount: 1,
          orderCount: 1,
          avgOrderValue: 1,
        },
      },
    ])
    .toArray();

  // Get menu metrics
  const menuMetrics = await billsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$items',
          quantity: { $sum: 1 },
          revenue: { $sum: { $toDouble: '$resultPrice' } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          menuId: '$_id',
          menuName: '$_id',
          quantity: 1,
          revenue: 1,
          orderCount: 1,
        },
      },
    ])
    .toArray();

  return {
    dailyMetrics,
    menuMetrics,
  };
}
