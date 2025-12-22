import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/cache/sqlite';

/**
 * GET /api/menus/search-stores
 *
 * Search for stores that sell specific menus
 * Supports multiple menu search with comma separation (intersection mode)
 *
 * Query params:
 *   - q: menu name search query (required), comma-separated for multiple menus
 *   - startDate: start date filter (optional, defaults to last 30 days)
 *   - endDate: end date filter (optional, defaults to today)
 *   - limit: max stores to return per menu (optional, defaults to 500)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const startDate = searchParams.get('startDate') || getDefaultStartDate();
    const endDate = searchParams.get('endDate') || getDefaultEndDate();
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    if (!query || query.length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required (at least 1 character)',
      }, { status: 400 });
    }

    const db = getDb();

    // Parse multiple search terms (comma-separated)
    const searchTerms = query.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const isMultiSearch = searchTerms.length > 1;

    if (isMultiSearch) {
      // Multi-menu search: Find stores that have ALL searched menus (intersection)
      return handleMultiMenuSearch(db, searchTerms, startDate, endDate, limit);
    } else {
      // Single menu search: Original behavior
      return handleSingleMenuSearch(db, searchTerms[0], startDate, endDate, limit);
    }
  } catch (error: any) {
    console.error('Menu search stores API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle single menu search (original behavior)
 */
function handleSingleMenuSearch(
  db: any,
  searchTerm: string,
  startDate: string,
  endDate: string,
  limit: number
) {
  // Search for stores selling menus matching the query
  const storesQuery = `
    SELECT
      storeId,
      storeName,
      menuName,
      SUM(quantity) as totalQuantity,
      SUM(revenue) as totalRevenue,
      SUM(orderCount) as totalOrders,
      COUNT(DISTINCT date) as activeDays
    FROM metrics_daily_store_menu
    WHERE menuName LIKE ?
      AND date >= ?
      AND date <= ?
    GROUP BY storeId, storeName, menuName
    ORDER BY totalQuantity DESC
    LIMIT ?
  `;

  const stores = db.prepare(storesQuery).all(
    `%${searchTerm}%`,
    startDate,
    endDate,
    limit
  );

  // Get unique menu names matching the query
  const menusQuery = `
    SELECT DISTINCT menuName, COUNT(DISTINCT storeId) as storeCount
    FROM metrics_daily_store_menu
    WHERE menuName LIKE ?
      AND date >= ?
      AND date <= ?
    GROUP BY menuName
    ORDER BY storeCount DESC
    LIMIT 30
  `;

  const matchingMenus = db.prepare(menusQuery).all(
    `%${searchTerm}%`,
    startDate,
    endDate
  );

  // Group stores by menu name
  const storesByMenu: Record<string, any[]> = {};
  for (const store of stores as any[]) {
    const menuName = store.menuName;
    if (!storesByMenu[menuName]) {
      storesByMenu[menuName] = [];
    }
    storesByMenu[menuName].push({
      storeId: store.storeId,
      storeName: store.storeName,
      totalQuantity: store.totalQuantity,
      totalRevenue: store.totalRevenue,
      totalOrders: store.totalOrders,
      activeDays: store.activeDays,
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      query: searchTerm,
      searchTerms: [searchTerm],
      isMultiSearch: false,
      dateRange: { startDate, endDate },
      matchingMenus,
      storesByMenu,
      totalStores: new Set((stores as any[]).map(s => s.storeId)).size,
    },
  });
}

/**
 * Handle multi-menu search (intersection - stores with ALL menus)
 */
function handleMultiMenuSearch(
  db: any,
  searchTerms: string[],
  startDate: string,
  endDate: string,
  limit: number
) {
  // For each search term, find matching menu names and their stores
  const termResults: Map<string, Set<string>>[] = []; // menuName -> Set of storeIds for each term
  const allMatchingMenus: Array<{ menuName: string; storeCount: number; searchTerm: string }> = [];
  const storeMenuData: Map<string, any> = new Map(); // storeId -> store data with menus

  for (const term of searchTerms) {
    const termMenuStores = new Map<string, Set<string>>();

    // Get menus matching this term
    const menusQuery = `
      SELECT DISTINCT menuName, COUNT(DISTINCT storeId) as storeCount
      FROM metrics_daily_store_menu
      WHERE menuName LIKE ?
        AND date >= ?
        AND date <= ?
      GROUP BY menuName
      ORDER BY storeCount DESC
      LIMIT 30
    `;

    const matchingMenus = db.prepare(menusQuery).all(
      `%${term}%`,
      startDate,
      endDate
    ) as any[];

    for (const menu of matchingMenus) {
      allMatchingMenus.push({
        menuName: menu.menuName,
        storeCount: menu.storeCount,
        searchTerm: term,
      });
    }

    // Get stores for each matching menu
    const storesQuery = `
      SELECT
        storeId,
        storeName,
        menuName,
        SUM(quantity) as totalQuantity,
        SUM(revenue) as totalRevenue,
        SUM(orderCount) as totalOrders,
        COUNT(DISTINCT date) as activeDays
      FROM metrics_daily_store_menu
      WHERE menuName LIKE ?
        AND date >= ?
        AND date <= ?
      GROUP BY storeId, storeName, menuName
      ORDER BY totalQuantity DESC
    `;

    const stores = db.prepare(storesQuery).all(
      `%${term}%`,
      startDate,
      endDate
    ) as any[];

    // Group by menu and collect store IDs
    for (const store of stores) {
      const menuName = store.menuName;
      if (!termMenuStores.has(menuName)) {
        termMenuStores.set(menuName, new Set());
      }
      termMenuStores.get(menuName)!.add(store.storeId);

      // Store detailed data for later
      const key = `${store.storeId}_${menuName}`;
      storeMenuData.set(key, {
        storeId: store.storeId,
        storeName: store.storeName,
        menuName: store.menuName,
        totalQuantity: store.totalQuantity,
        totalRevenue: store.totalRevenue,
        totalOrders: store.totalOrders,
        activeDays: store.activeDays,
        searchTerm: term,
      });
    }

    termResults.push(termMenuStores);
  }

  // Find stores that appear in ALL search terms (intersection)
  // For each term, get all stores that have at least one matching menu
  const storesByTerm: Set<string>[] = termResults.map(termMenuStores => {
    const storeIds = new Set<string>();
    for (const stores of termMenuStores.values()) {
      for (const storeId of stores) {
        storeIds.add(storeId);
      }
    }
    return storeIds;
  });

  // Intersection of all terms
  let intersectionStores = storesByTerm[0];
  for (let i = 1; i < storesByTerm.length; i++) {
    intersectionStores = new Set(
      [...intersectionStores].filter(x => storesByTerm[i].has(x))
    );
  }

  // Build result with stores that have all menus
  const storesWithAllMenus: any[] = [];
  const storeAggregates = new Map<string, any>();

  for (const storeId of intersectionStores) {
    let storeName = '';
    let totalQuantity = 0;
    let totalRevenue = 0;
    let totalOrders = 0;
    let maxActiveDays = 0;
    const matchedMenus: string[] = [];

    // Aggregate data from all matching menus for this store
    for (const [key, data] of storeMenuData.entries()) {
      if (data.storeId === storeId) {
        storeName = data.storeName;
        totalQuantity += data.totalQuantity;
        totalRevenue += data.totalRevenue;
        totalOrders += data.totalOrders;
        maxActiveDays = Math.max(maxActiveDays, data.activeDays);
        if (!matchedMenus.includes(data.menuName)) {
          matchedMenus.push(data.menuName);
        }
      }
    }

    storesWithAllMenus.push({
      storeId,
      storeName,
      totalQuantity,
      totalRevenue,
      totalOrders,
      activeDays: maxActiveDays,
      matchedMenus,
    });
  }

  // Sort by total quantity
  storesWithAllMenus.sort((a, b) => b.totalQuantity - a.totalQuantity);

  // Group menus by search term for display
  const menusByTerm: Record<string, Array<{ menuName: string; storeCount: number }>> = {};
  for (const term of searchTerms) {
    menusByTerm[term] = allMatchingMenus
      .filter(m => m.searchTerm === term)
      .map(m => ({ menuName: m.menuName, storeCount: m.storeCount }));
  }

  return NextResponse.json({
    success: true,
    data: {
      query: searchTerms.join(', '),
      searchTerms,
      isMultiSearch: true,
      dateRange: { startDate, endDate },
      matchingMenus: allMatchingMenus,
      menusByTerm,
      storesByMenu: { '__intersection__': storesWithAllMenus.slice(0, limit) },
      intersectionStores: storesWithAllMenus.slice(0, limit),
      totalStores: intersectionStores.size,
    },
  });
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}
