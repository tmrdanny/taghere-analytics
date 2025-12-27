/**
 * Health Check Query Logic
 * Analyzes store health based on churn patterns
 */

import { getDb } from '@/lib/cache/sqlite';

// Stores to exclude from analysis
const EXCLUDED_STORE_NAMES = [
  '태그히어 데모 (테스트)',
  '호미',
];

export type HealthStatus = 'active' | 'warning' | 'danger' | 'churned';

export interface StoreHealthData {
  storeId: string;
  storeName: string;
  healthScore: number;
  status: HealthStatus;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  gmvChange: number; // percentage change (week over week)
  menuDiversityChange: number; // percentage change
  activeDaysChange: number; // percentage change
  recentGmv: number; // last 7 days
  previousGmv: number; // 8-14 days ago
  recentMenuCount: number;
  previousMenuCount: number;
  recentActiveDays: number;
  previousActiveDays: number;
}

export interface HealthCheckSummary {
  active: number;
  warning: number;
  danger: number;
  churned: number;
  total: number;
}

export interface HealthCheckResult {
  summary: HealthCheckSummary;
  stores: StoreHealthData[];
}

/**
 * Calculate Health Score based on churn pattern analysis
 *
 * Weights:
 * - GMV decrease rate: 40%
 * - Menu diversity decrease: 25%
 * - Active days decrease: 20%
 * - Days since last order: 15 points max
 */
function calculateHealthScore(
  gmvChange: number,
  menuDiversityChange: number,
  activeDaysChange: number,
  daysSinceLastOrder: number
): number {
  // Calculate decrease rates (positive means decrease, negative means increase)
  const gmvDecreaseRate = Math.max(0, -gmvChange / 100);
  const menuDecreaseRate = Math.max(0, -menuDiversityChange / 100);
  const daysDecreaseRate = Math.max(0, -activeDaysChange / 100);

  // Days since last order penalty (max 15 points for 30+ days)
  const lastOrderPenalty = Math.min(daysSinceLastOrder / 30, 1);

  // Calculate total deductions
  const deductions =
    (gmvDecreaseRate * 100 * 0.40) +     // 40% weight
    (menuDecreaseRate * 100 * 0.25) +    // 25% weight
    (daysDecreaseRate * 100 * 0.20) +    // 20% weight
    (lastOrderPenalty * 15);              // max 15 points

  // Health score: 100 minus deductions, minimum 0
  return Math.max(0, Math.round(100 - deductions));
}

/**
 * Determine health status based on days since last order
 */
function getHealthStatus(daysSinceLastOrder: number): HealthStatus {
  if (daysSinceLastOrder <= 7) return 'active';
  if (daysSinceLastOrder <= 30) return 'warning';
  if (daysSinceLastOrder <= 90) return 'danger';
  return 'churned';
}

/**
 * Get health check data for all stores
 */
export function getHealthCheckData(statusFilter?: HealthStatus): HealthCheckResult {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Calculate date ranges
  const getDateOffset = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const week1Start = getDateOffset(7);
  const week1End = getDateOffset(1);
  const week2Start = getDateOffset(14);
  const week2End = getDateOffset(8);

  // Build exclusion clause
  const excludePlaceholders = EXCLUDED_STORE_NAMES.map(() => '?').join(',');

  // Get store metrics for recent week (days 1-7)
  const recentMetrics = db.prepare(`
    SELECT
      storeId,
      storeName,
      MAX(date) as lastOrderDate,
      SUM(gmv) as totalGmv,
      COUNT(DISTINCT date) as activeDays
    FROM metrics_daily_store
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    GROUP BY storeId
  `).all(week1Start, week1End, ...EXCLUDED_STORE_NAMES) as Array<{
    storeId: string;
    storeName: string;
    lastOrderDate: string;
    totalGmv: number;
    activeDays: number;
  }>;

  // Get store metrics for previous week (days 8-14)
  const previousMetrics = db.prepare(`
    SELECT
      storeId,
      SUM(gmv) as totalGmv,
      COUNT(DISTINCT date) as activeDays
    FROM metrics_daily_store
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    GROUP BY storeId
  `).all(week2Start, week2End, ...EXCLUDED_STORE_NAMES) as Array<{
    storeId: string;
    totalGmv: number;
    activeDays: number;
  }>;

  // Get menu diversity for recent week
  const recentMenuDiversity = db.prepare(`
    SELECT
      storeId,
      COUNT(DISTINCT menuId) as menuCount
    FROM metrics_daily_store_menu
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    GROUP BY storeId
  `).all(week1Start, week1End, ...EXCLUDED_STORE_NAMES) as Array<{
    storeId: string;
    menuCount: number;
  }>;

  // Get menu diversity for previous week
  const previousMenuDiversity = db.prepare(`
    SELECT
      storeId,
      COUNT(DISTINCT menuId) as menuCount
    FROM metrics_daily_store_menu
    WHERE date >= ? AND date <= ?
    AND storeName NOT IN (${excludePlaceholders})
    GROUP BY storeId
  `).all(week2Start, week2End, ...EXCLUDED_STORE_NAMES) as Array<{
    storeId: string;
    menuCount: number;
  }>;

  // Get overall last order date for each store
  const lastOrderDates = db.prepare(`
    SELECT
      storeId,
      storeName,
      MAX(date) as lastOrderDate
    FROM metrics_daily_store
    WHERE storeName NOT IN (${excludePlaceholders})
    GROUP BY storeId
  `).all(...EXCLUDED_STORE_NAMES) as Array<{
    storeId: string;
    storeName: string;
    lastOrderDate: string;
  }>;

  // Create lookup maps
  const previousMetricsMap = new Map(previousMetrics.map(m => [m.storeId, m]));
  const recentMenuMap = new Map(recentMenuDiversity.map(m => [m.storeId, m.menuCount]));
  const previousMenuMap = new Map(previousMenuDiversity.map(m => [m.storeId, m.menuCount]));
  const recentMetricsMap = new Map(recentMetrics.map(m => [m.storeId, m]));

  // Calculate health for all stores
  const storeHealthList: StoreHealthData[] = [];

  for (const store of lastOrderDates) {
    const recentData = recentMetricsMap.get(store.storeId);
    const previousData = previousMetricsMap.get(store.storeId);
    const recentMenuCount = recentMenuMap.get(store.storeId) || 0;
    const previousMenuCount = previousMenuMap.get(store.storeId) || 0;

    // Calculate days since last order
    const lastOrderDate = new Date(store.lastOrderDate);
    const todayDate = new Date(today);
    const daysSinceLastOrder = Math.floor((todayDate.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get metrics with defaults
    const recentGmv = recentData?.totalGmv || 0;
    const previousGmv = previousData?.totalGmv || 0;
    const recentActiveDays = recentData?.activeDays || 0;
    const previousActiveDays = previousData?.activeDays || 0;

    // Calculate percentage changes
    const gmvChange = previousGmv > 0
      ? ((recentGmv - previousGmv) / previousGmv) * 100
      : (recentGmv > 0 ? 100 : 0);

    const menuDiversityChange = previousMenuCount > 0
      ? ((recentMenuCount - previousMenuCount) / previousMenuCount) * 100
      : (recentMenuCount > 0 ? 100 : 0);

    const activeDaysChange = previousActiveDays > 0
      ? ((recentActiveDays - previousActiveDays) / previousActiveDays) * 100
      : (recentActiveDays > 0 ? 100 : 0);

    // Calculate health score and status
    const healthScore = calculateHealthScore(
      gmvChange,
      menuDiversityChange,
      activeDaysChange,
      daysSinceLastOrder
    );

    const status = getHealthStatus(daysSinceLastOrder);

    storeHealthList.push({
      storeId: store.storeId,
      storeName: store.storeName,
      healthScore,
      status,
      lastOrderDate: store.lastOrderDate,
      daysSinceLastOrder,
      gmvChange: Math.round(gmvChange * 10) / 10,
      menuDiversityChange: Math.round(menuDiversityChange * 10) / 10,
      activeDaysChange: Math.round(activeDaysChange * 10) / 10,
      recentGmv,
      previousGmv,
      recentMenuCount,
      previousMenuCount,
      recentActiveDays,
      previousActiveDays,
    });
  }

  // Filter by status if provided
  let filteredStores = storeHealthList;
  if (statusFilter) {
    filteredStores = storeHealthList.filter(s => s.status === statusFilter);
  }

  // Sort by health score (lowest first - most at risk)
  filteredStores.sort((a, b) => a.healthScore - b.healthScore);

  // Calculate summary
  const summary: HealthCheckSummary = {
    active: storeHealthList.filter(s => s.status === 'active').length,
    warning: storeHealthList.filter(s => s.status === 'warning').length,
    danger: storeHealthList.filter(s => s.status === 'danger').length,
    churned: storeHealthList.filter(s => s.status === 'churned').length,
    total: storeHealthList.length,
  };

  return {
    summary,
    stores: filteredStores,
  };
}
