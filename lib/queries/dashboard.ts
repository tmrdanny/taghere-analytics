/**
 * Dashboard queries
 * These queries ONLY access pre-aggregated metrics collections
 * NEVER query raw operational collections (orders, payments, etc.)
 */

import { getReadOnlyDb } from '../mongodb';
import { MetricsFilter, DashboardKPI } from '../types/metrics';
import { format } from 'date-fns';

/**
 * Validate date range
 * Note: No hard limit enforced - users can query any date range
 */
function validateDateRange(startDate: Date, endDate: Date): void {
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }

  // Performance warning for large ranges (no enforcement)
  if (daysDiff > 365) {
    console.warn(`Large date range: ${daysDiff} days. May impact performance.`);
  }
}

/**
 * Get dashboard KPIs from pre-aggregated metrics
 *
 * IMPORTANT: This function ONLY queries metrics collections
 * It does NOT touch raw operational data
 */
export async function getDashboardKPIs(
  filter: MetricsFilter
): Promise<DashboardKPI> {
  // Validate date range
  validateDateRange(filter.startDate, filter.endDate);

  const db = await getReadOnlyDb();
  const metricsCollection = db.collection('metrics_daily_store');

  // Build match filter
  const matchFilter: any = {
    date: {
      $gte: filter.startDate,
      $lte: filter.endDate,
    },
  };

  if (filter.storeIds && filter.storeIds.length > 0) {
    matchFilter.storeId = { $in: filter.storeIds };
  }

  // Query 1: Get total metrics (sum across all stores/days)
  const totalMetrics = await metricsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalGMV: { $sum: '$gmv' },
          totalPaidAmount: { $sum: '$paidAmount' },
          totalOrders: { $sum: '$orderCount' },
          totalSuccessfulPayments: { $sum: '$successfulPayments' },
          totalFailedPayments: { $sum: '$failedPayments' },
          activeStores: { $addToSet: '$storeId' },
        },
      },
      {
        $project: {
          _id: 0,
          totalGMV: 1,
          totalPaidAmount: 1,
          totalOrders: 1,
          totalSuccessfulPayments: 1,
          totalFailedPayments: 1,
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

  const paymentSuccessRate =
    totals.totalSuccessfulPayments + totals.totalFailedPayments > 0
      ? totals.totalSuccessfulPayments /
        (totals.totalSuccessfulPayments + totals.totalFailedPayments)
      : 0;

  // Query 2: Get daily time series (sum across stores per day)
  const dailyMetrics = await metricsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$date',
          gmv: { $sum: '$gmv' },
          paidAmount: { $sum: '$paidAmount' },
          orders: { $sum: '$orderCount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$_id' },
          },
          gmv: 1,
          paidAmount: 1,
          orders: 1,
        },
      },
    ])
    .toArray();

  // Query 3: Top stores by GMV
  const topStoresByGMV = await metricsCollection
    .aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$storeId',
          storeName: { $first: '$storeName' },
          gmv: { $sum: '$gmv' },
          orders: { $sum: '$orderCount' },
        },
      },
      { $sort: { gmv: -1 } },
      { $limit: filter.limit || 10 },
      {
        $project: {
          _id: 0,
          storeId: '$_id',
          storeName: 1,
          gmv: 1,
          orders: 1,
        },
      },
    ])
    .toArray();

  // Query 4: Top menus by quantity
  const menuMetricsCollection = db.collection('metrics_daily_store_menu');

  const menuMatchFilter: any = {
    date: {
      $gte: filter.startDate,
      $lte: filter.endDate,
    },
  };

  if (filter.storeIds && filter.storeIds.length > 0) {
    menuMatchFilter.storeId = { $in: filter.storeIds };
  }

  const topMenusByQuantity = await menuMetricsCollection
    .aggregate([
      { $match: menuMatchFilter },
      {
        $group: {
          _id: { menuId: '$menuId', menuName: '$menuName' },
          quantity: { $sum: '$quantity' },
          revenue: { $sum: '$revenue' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: filter.limit || 10 },
      {
        $project: {
          _id: 0,
          menuId: '$_id.menuId',
          menuName: '$_id.menuName',
          quantity: 1,
          revenue: 1,
        },
      },
    ])
    .toArray();

  // Query 5: Top menus by revenue
  const topMenusByRevenue = await menuMetricsCollection
    .aggregate([
      { $match: menuMatchFilter },
      {
        $group: {
          _id: { menuId: '$menuId', menuName: '$menuName' },
          revenue: { $sum: '$revenue' },
          quantity: { $sum: '$quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: filter.limit || 10 },
      {
        $project: {
          _id: 0,
          menuId: '$_id.menuId',
          menuName: '$_id.menuName',
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
 * Get metrics for a specific store
 */
export async function getStoreMetrics(
  storeId: string,
  startDate: Date,
  endDate: Date
) {
  validateDateRange(startDate, endDate);

  const db = await getReadOnlyDb();

  // Get store daily metrics
  const dailyMetrics = await db
    .collection('metrics_daily_store')
    .find({
      storeId,
      date: { $gte: startDate, $lte: endDate },
    })
    .sort({ date: 1 })
    .project({
      _id: 0,
      date: 1,
      gmv: 1,
      paidAmount: 1,
      orderCount: 1,
      avgOrderValue: 1,
    })
    .toArray();

  // Get store menu metrics
  const menuMetrics = await db
    .collection('metrics_daily_store_menu')
    .aggregate([
      {
        $match: {
          storeId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { menuId: '$menuId', menuName: '$menuName' },
          quantity: { $sum: '$quantity' },
          revenue: { $sum: '$revenue' },
          orderCount: { $sum: '$orderCount' },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          _id: 0,
          menuId: '$_id.menuId',
          menuName: '$_id.menuName',
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
