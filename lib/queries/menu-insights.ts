import { format } from 'date-fns';
import { getDb } from '@/lib/cache/sqlite';
import { getReadOnlyDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  MenuInsightFilter,
  MenuRanking,
  MenuContribution,
  MenuTrend,
  CrossSellingPair,
} from '@/lib/types/menu-insights';

// Maximum menu unit price threshold (menus with unit price above this are excluded)
const MAX_MENU_UNIT_PRICE = 1000000; // 1,000,000 KRW

// Stores to exclude from all statistics
const EXCLUDED_STORE_NAMES = [
  '태그히어 데모 (테스트)',
  '호미',
];

/**
 * Get top menus by quantity and revenue
 */
export async function getMenuRankings(filter: MenuInsightFilter) {
  const db = getDb();
  const startDateStr = format(filter.startDate, 'yyyy-MM-dd');
  const endDateStr = format(filter.endDate, 'yyyy-MM-dd');

  console.log('[getMenuRankings]', {
    startDate: filter.startDate,
    endDate: filter.endDate,
    startDateStr,
    endDateStr,
    storeIds: filter.storeIds,
  });

  // Build exclusion clause for test stores
  const excludePlaceholders = EXCLUDED_STORE_NAMES.map(() => '?').join(',');

  let whereClause = `WHERE date >= ? AND date <= ? AND storeName NOT IN (${excludePlaceholders}) AND (quantity = 0 OR (revenue / quantity) <= ?)`;
  const params: any[] = [startDateStr, endDateStr, ...EXCLUDED_STORE_NAMES, MAX_MENU_UNIT_PRICE];

  if (filter.storeIds && filter.storeIds.length > 0) {
    whereClause += ` AND storeId IN (${filter.storeIds.map(() => '?').join(',')})`;
    params.push(...filter.storeIds);
  }

  if (filter.menuName) {
    whereClause += ' AND menuName LIKE ?';
    params.push(`%${filter.menuName}%`);
  }

  // Top by quantity
  const topByQuantityQuery = `
    SELECT
      menuName,
      SUM(quantity) as quantity,
      SUM(revenue) as revenue,
      SUM(orderCount) as orderCount,
      SUM(revenue) * 1.0 / SUM(quantity) as avgPrice
    FROM metrics_daily_store_menu
    ${whereClause}
    GROUP BY menuName
    ORDER BY quantity DESC
    LIMIT ?
  `;

  const topByQuantity = db.prepare(topByQuantityQuery).all([...params, filter.limit || 10]) as MenuRanking[];

  console.log('[getMenuRankings] Results:', {
    topByQuantityCount: topByQuantity.length,
    params,
  });

  // Top by revenue
  const topByRevenueQuery = `
    SELECT
      menuName,
      SUM(quantity) as quantity,
      SUM(revenue) as revenue,
      SUM(orderCount) as orderCount,
      SUM(revenue) * 1.0 / SUM(quantity) as avgPrice
    FROM metrics_daily_store_menu
    ${whereClause}
    GROUP BY menuName
    ORDER BY revenue DESC
    LIMIT ?
  `;

  const topByRevenue = db.prepare(topByRevenueQuery).all([...params, filter.limit || 10]) as MenuRanking[];

  return {
    topByQuantity,
    topByRevenue,
  };
}

/**
 * Get revenue contribution (Pareto analysis)
 */
export async function getRevenueContribution(filter: MenuInsightFilter) {
  const db = getDb();
  const startDateStr = format(filter.startDate, 'yyyy-MM-dd');
  const endDateStr = format(filter.endDate, 'yyyy-MM-dd');

  // Build exclusion clause for test stores
  const excludePlaceholders = EXCLUDED_STORE_NAMES.map(() => '?').join(',');

  let whereClause = `WHERE date >= ? AND date <= ? AND storeName NOT IN (${excludePlaceholders}) AND (quantity = 0 OR (revenue / quantity) <= ?)`;
  const params: any[] = [startDateStr, endDateStr, ...EXCLUDED_STORE_NAMES, MAX_MENU_UNIT_PRICE];

  if (filter.storeIds && filter.storeIds.length > 0) {
    whereClause += ` AND storeId IN (${filter.storeIds.map(() => '?').join(',')})`;
    params.push(...filter.storeIds);
  }

  if (filter.menuName) {
    whereClause += ' AND menuName LIKE ?';
    params.push(`%${filter.menuName}%`);
  }

  const query = `
    SELECT
      menuName,
      SUM(quantity) as quantity,
      SUM(revenue) as revenue
    FROM metrics_daily_store_menu
    ${whereClause}
    GROUP BY menuName
    ORDER BY revenue DESC
  `;

  const menuData = db.prepare(query).all(params) as Array<{
    menuName: string;
    quantity: number;
    revenue: number;
  }>;

  // Calculate totals
  const totalRevenue = menuData.reduce((sum, m) => sum + m.revenue, 0);
  const totalQuantity = menuData.reduce((sum, m) => sum + m.quantity, 0);

  // Calculate percentages and cumulative
  let cumulative = 0;
  const menuContributions: MenuContribution[] = menuData.map(m => {
    const revenuePercent = totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0;
    cumulative += revenuePercent;

    return {
      menuName: m.menuName,
      revenue: m.revenue,
      revenuePercent,
      quantity: m.quantity,
      quantityPercent: totalQuantity > 0 ? (m.quantity / totalQuantity) * 100 : 0,
      cumulativePercent: cumulative,
    };
  });

  return {
    menuContributions,
    totalRevenue,
    totalQuantity,
  };
}

/**
 * Get menu trends (time series)
 */
export async function getMenuTrends(filter: MenuInsightFilter) {
  const db = getDb();
  const startDateStr = format(filter.startDate, 'yyyy-MM-dd');
  const endDateStr = format(filter.endDate, 'yyyy-MM-dd');

  // Build exclusion clause for test stores
  const excludePlaceholders = EXCLUDED_STORE_NAMES.map(() => '?').join(',');

  let whereClause = `WHERE date >= ? AND date <= ? AND storeName NOT IN (${excludePlaceholders}) AND (quantity = 0 OR (revenue / quantity) <= ?)`;
  const params: any[] = [startDateStr, endDateStr, ...EXCLUDED_STORE_NAMES, MAX_MENU_UNIT_PRICE];

  if (filter.storeIds && filter.storeIds.length > 0) {
    whereClause += ` AND storeId IN (${filter.storeIds.map(() => '?').join(',')})`;
    params.push(...filter.storeIds);
  }

  if (filter.menuName) {
    whereClause += ' AND menuName LIKE ?';
    params.push(`%${filter.menuName}%`);
  }

  // Get top N menus first
  const topMenusQuery = `
    SELECT menuName, SUM(quantity) as totalQuantity
    FROM metrics_daily_store_menu
    ${whereClause}
    GROUP BY menuName
    ORDER BY totalQuantity DESC
    LIMIT ?
  `;

  const topMenus = db.prepare(topMenusQuery).all([...params, filter.limit || 10]) as Array<{
    menuName: string;
    totalQuantity: number;
  }>;

  // Get daily data for each menu
  const menuTrends: MenuTrend[] = topMenus.map(menu => {
    let menuWhereClause = `WHERE date >= ? AND date <= ? AND menuName = ? AND storeName NOT IN (${excludePlaceholders}) AND (quantity = 0 OR (revenue / quantity) <= ?)`;
    const menuParams: any[] = [startDateStr, endDateStr, menu.menuName, ...EXCLUDED_STORE_NAMES, MAX_MENU_UNIT_PRICE];

    if (filter.storeIds && filter.storeIds.length > 0) {
      menuWhereClause += ` AND storeId IN (${filter.storeIds.map(() => '?').join(',')})`;
      menuParams.push(...filter.storeIds);
    }

    const dailyQuery = `
      SELECT
        date,
        SUM(quantity) as quantity,
        SUM(revenue) as revenue
      FROM metrics_daily_store_menu
      ${menuWhereClause}
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyData = db.prepare(dailyQuery).all(menuParams) as Array<{
      date: string;
      quantity: number;
      revenue: number;
    }>;

    // Calculate growth rate
    const first = dailyData[0]?.quantity || 0;
    const last = dailyData[dailyData.length - 1]?.quantity || 0;
    const growthRate = first > 0 ? ((last - first) / first) * 100 : 0;

    const avgDaily = dailyData.length > 0
      ? dailyData.reduce((sum, d) => sum + d.quantity, 0) / dailyData.length
      : 0;

    return {
      menuName: menu.menuName,
      dailyData,
      growthRate,
      averageDaily: avgDaily,
    };
  });

  return { menuTrends };
}

/**
 * Get cross-selling pairs (association analysis)
 */
export async function getCrossSellingPairs(filter: MenuInsightFilter) {
  const mongodb = await getReadOnlyDb();
  const billsCollection = mongodb.collection('bills');

  const startDateStr = format(filter.startDate, 'yyyy-MM-dd');
  const endDateStr = format(filter.endDate, 'yyyy-MM-dd');

  const matchFilter: any = {
    dateOnly: { $gte: startDateStr, $lte: endDateStr }
  };

  // Handle store filtering - convert string IDs to ObjectId only if they're valid ObjectId strings
  if (filter.storeIds && filter.storeIds.length > 0) {
    try {
      matchFilter.storeOID = {
        $in: filter.storeIds.map(id => {
          // Try to create ObjectId, if fails, use the ID as-is
          try {
            return new ObjectId(id);
          } catch {
            return id;
          }
        })
      };
      console.log(`[CrossSelling] Filtering by ${filter.storeIds.length} stores`);
    } catch (e) {
      console.warn('[CrossSelling] Failed to parse store IDs, proceeding without filter');
    }
  }

  // Fetch bills and process in-memory
  const bills = await billsCollection.aggregate([
    {
      $addFields: {
        dateOnly: { $substr: ['$date', 0, 10] }
      }
    },
    { $match: matchFilter },
    {
      $project: {
        items: 1,
      }
    }
  ]).toArray();

  console.log(`[CrossSelling] Processing ${bills.length} bills`);

  // Parse items and count co-occurrences
  const coOccurrenceMap = new Map<string, number>();
  const menuCounts = new Map<string, number>();
  let totalBills = bills.length;
  let parseErrors = 0;

  for (const bill of bills) {
    try {
      const items = JSON.parse(bill.items);
      if (!Array.isArray(items)) continue;

      const menuLabels = items.map((i: any) => i.label).filter(Boolean);

      // Count individual menus (each item counted)
      for (const label of menuLabels) {
        menuCounts.set(label, (menuCounts.get(label) || 0) + 1);
      }

      // Count pairs based on unique menu combinations in this bill
      // If menu A and menu B both exist in same bill = 1 co-occurrence
      const uniqueLabels = [...new Set(menuLabels)];
      for (let i = 0; i < uniqueLabels.length; i++) {
        for (let j = i + 1; j < uniqueLabels.length; j++) {
          const pair = [uniqueLabels[i], uniqueLabels[j]].sort().join('|||');
          coOccurrenceMap.set(pair, (coOccurrenceMap.get(pair) || 0) + 1);
        }
      }
    } catch (e) {
      parseErrors++;
      continue;
    }
  }

  console.log(`[CrossSelling] Found ${coOccurrenceMap.size} unique pairs (${parseErrors} parse errors)`);
  console.log(`[CrossSelling] Top menus:`, Array.from(menuCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5));

  // Calculate metrics
  const pairs: CrossSellingPair[] = [];

  for (const [pairKey, count] of coOccurrenceMap.entries()) {
    const [menu1, menu2] = pairKey.split('|||');

    const menu1Count = menuCounts.get(menu1) || 0;
    const menu2Count = menuCounts.get(menu2) || 0;

    if (menu1Count === 0 || menu2Count === 0 || totalBills === 0) continue;

    // Confidence: P(menu2|menu1) = count / menu1Count
    const confidence = count / menu1Count;

    // Lift: P(menu1 & menu2) / (P(menu1) * P(menu2))
    const probMenu1 = menu1Count / totalBills;
    const probMenu2 = menu2Count / totalBills;
    const probBoth = count / totalBills;
    const lift = (probMenu1 * probMenu2) > 0
      ? probBoth / (probMenu1 * probMenu2)
      : 0;

    pairs.push({
      menu1,
      menu2,
      coOccurrences: count,
      confidence,
      lift,
    });
  }

  // Sort by lift (strongest associations first)
  pairs.sort((a, b) => b.lift - a.lift);

  if (pairs.length > 0) {
    console.log(`[CrossSelling] Top pair: ${pairs[0].menu1} <-> ${pairs[0].menu2} (count: ${pairs[0].coOccurrences}, lift: ${pairs[0].lift.toFixed(2)})`);
  }

  return {
    pairs: pairs.slice(0, filter.limit || 20)
  };
}
