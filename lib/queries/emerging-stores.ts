/**
 * Emerging Stores Query Logic
 * Detects fast-growing stores based on composite growth metrics
 */

import { getDb } from '@/lib/cache/sqlite';

// Stores to exclude from analysis
const EXCLUDED_STORE_NAMES = [
  '태그히어 데모 (테스트)',
  '호미',
];

// Growth score weights (total = 100%)
const GROWTH_WEIGHTS = {
  gmv: 0.40,        // GMV growth: 40%
  orderCount: 0.35, // Order count growth: 35%
  paidAmount: 0.25, // Paid amount growth: 25%
};

// Minimum previous GMV to be included in analysis
// Filters out stores with little/no previous activity to avoid inflated growth rates
const MIN_PREVIOUS_GMV = 500000; // 50만원

export interface EmergingStoreData {
  storeId: string;
  storeName: string;
  growthScore: number;
  rank: number;

  // Individual growth rates (%)
  gmvGrowth: number;
  orderCountGrowth: number;
  paidAmountGrowth: number;

  // Recent period metrics
  recentGmv: number;
  recentOrders: number;
  recentPaidAmount: number;

  // Previous period metrics
  previousGmv: number;
  previousOrders: number;
  previousPaidAmount: number;

  // Activity metrics
  recentActiveDays: number;
  previousActiveDays: number;
}

export interface EmergingStoresSummary {
  totalAnalyzed: number;
  emergingCount: number;   // score >= 50
  decliningCount: number;  // score < 0
  averageGrowthScore: number;
}

export interface EmergingStoresResult {
  summary: EmergingStoresSummary;
  stores: EmergingStoreData[];
}

/**
 * Calculate growth percentage
 */
function calculateGrowthPercentage(recent: number, previous: number): number {
  if (previous === 0) {
    return recent > 0 ? 100 : 0;
  }
  return ((recent - previous) / previous) * 100;
}

/**
 * Calculate composite growth score
 * 100% growth in all metrics = 50 points
 * Allows negative values for declining stores
 */
function calculateGrowthScore(
  gmvGrowth: number,
  orderCountGrowth: number,
  paidAmountGrowth: number
): number {
  // Normalize: 100% growth = 50 points contribution per metric
  const normalizedGmv = gmvGrowth / 2;
  const normalizedOrders = orderCountGrowth / 2;
  const normalizedPaid = paidAmountGrowth / 2;

  // Apply weights
  const score =
    (normalizedGmv * GROWTH_WEIGHTS.gmv) +
    (normalizedOrders * GROWTH_WEIGHTS.orderCount) +
    (normalizedPaid * GROWTH_WEIGHTS.paidAmount);

  return Math.round(score * 10) / 10;
}

/**
 * Get emerging stores data
 */
export function getEmergingStoresData(
  recentDays: number = 7,
  compareDays: number = 7,
  storeIds?: string[]
): EmergingStoresResult {
  const db = getDb();

  // Calculate date ranges
  const getDateOffset = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  // Recent period: 1 day ago ~ recentDays days ago
  const recentStart = getDateOffset(recentDays);
  const recentEnd = getDateOffset(1);

  // Previous period: (recentDays + 1) days ago ~ (recentDays + compareDays) days ago
  const compareStart = getDateOffset(recentDays + compareDays);
  const compareEnd = getDateOffset(recentDays + 1);

  // Build exclusion clause
  const excludePlaceholders = EXCLUDED_STORE_NAMES.map(() => '?').join(',');

  // Build store filter
  let storeIdFilter = '';
  const storeIdParams: string[] = [];
  if (storeIds && storeIds.length > 0) {
    const placeholders = storeIds.map(() => '?').join(',');
    storeIdFilter = `AND storeId IN (${placeholders})`;
    storeIdParams.push(...storeIds);
  }

  // Get recent period metrics
  const recentMetrics = db.prepare(`
    SELECT
      storeId,
      storeName,
      SUM(gmv) as totalGmv,
      SUM(paidAmount) as totalPaidAmount,
      SUM(orderCount) as totalOrders,
      COUNT(DISTINCT date) as activeDays
    FROM metrics_daily_store
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    ${storeIdFilter}
    GROUP BY storeId
  `).all(recentStart, recentEnd, ...EXCLUDED_STORE_NAMES, ...storeIdParams) as Array<{
    storeId: string;
    storeName: string;
    totalGmv: number;
    totalPaidAmount: number;
    totalOrders: number;
    activeDays: number;
  }>;

  // Get previous period metrics
  const previousMetrics = db.prepare(`
    SELECT
      storeId,
      SUM(gmv) as totalGmv,
      SUM(paidAmount) as totalPaidAmount,
      SUM(orderCount) as totalOrders,
      COUNT(DISTINCT date) as activeDays
    FROM metrics_daily_store
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    ${storeIdFilter}
    GROUP BY storeId
  `).all(compareStart, compareEnd, ...EXCLUDED_STORE_NAMES, ...storeIdParams) as Array<{
    storeId: string;
    totalGmv: number;
    totalPaidAmount: number;
    totalOrders: number;
    activeDays: number;
  }>;

  // Create lookup map for previous metrics
  const previousMap = new Map(previousMetrics.map(m => [m.storeId, m]));

  // Calculate growth scores for each store
  const storeGrowthList: EmergingStoreData[] = [];

  for (const recent of recentMetrics) {
    const previous = previousMap.get(recent.storeId);

    const previousGmv = previous?.totalGmv || 0;
    const previousOrders = previous?.totalOrders || 0;
    const previousPaidAmount = previous?.totalPaidAmount || 0;
    const previousActiveDays = previous?.activeDays || 0;

    // Filter out stores with insufficient previous activity
    // This prevents inflated growth rates from stores that were barely used before
    if (previousGmv < MIN_PREVIOUS_GMV) {
      continue;
    }

    // Calculate individual growth rates
    const gmvGrowth = calculateGrowthPercentage(recent.totalGmv, previousGmv);
    const orderCountGrowth = calculateGrowthPercentage(recent.totalOrders, previousOrders);
    const paidAmountGrowth = calculateGrowthPercentage(recent.totalPaidAmount, previousPaidAmount);

    // Calculate composite growth score
    const growthScore = calculateGrowthScore(gmvGrowth, orderCountGrowth, paidAmountGrowth);

    storeGrowthList.push({
      storeId: recent.storeId,
      storeName: recent.storeName,
      growthScore,
      rank: 0, // Will be set after sorting

      gmvGrowth: Math.round(gmvGrowth * 10) / 10,
      orderCountGrowth: Math.round(orderCountGrowth * 10) / 10,
      paidAmountGrowth: Math.round(paidAmountGrowth * 10) / 10,

      recentGmv: recent.totalGmv,
      recentOrders: recent.totalOrders,
      recentPaidAmount: recent.totalPaidAmount,

      previousGmv,
      previousOrders,
      previousPaidAmount,

      recentActiveDays: recent.activeDays,
      previousActiveDays,
    });
  }

  // Sort by growth score (highest first)
  storeGrowthList.sort((a, b) => b.growthScore - a.growthScore);

  // Assign ranks
  storeGrowthList.forEach((store, index) => {
    store.rank = index + 1;
  });

  // Calculate summary
  const totalAnalyzed = storeGrowthList.length;
  const emergingCount = storeGrowthList.filter(s => s.growthScore >= 50).length;
  const decliningCount = storeGrowthList.filter(s => s.growthScore < 0).length;
  const averageGrowthScore = totalAnalyzed > 0
    ? Math.round((storeGrowthList.reduce((sum, s) => sum + s.growthScore, 0) / totalAnalyzed) * 10) / 10
    : 0;

  return {
    summary: {
      totalAnalyzed,
      emergingCount,
      decliningCount,
      averageGrowthScore,
    },
    stores: storeGrowthList,
  };
}
