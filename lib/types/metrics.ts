/**
 * Pre-aggregated metrics collection schemas
 * These collections store pre-computed metrics to avoid querying raw operational data
 */

/**
 * Daily metrics aggregated by store
 * Collection: metrics_daily_store
 */
export interface MetricsDailyStore {
  _id?: string;
  storeId: string;
  storeName?: string;
  date: Date; // YYYY-MM-DD at 00:00:00 UTC

  // Core KPIs
  gmv: number; // Gross Merchandise Value (total transaction amount)
  paidAmount: number; // Total successfully paid amount
  orderCount: number; // Number of orders

  // Additional metrics
  successfulPayments: number; // Number of successful payments
  failedPayments: number; // Number of failed payments
  avgOrderValue: number; // Average order value (gmv / orderCount)

  // Derived fields
  paymentSuccessRate: number; // successfulPayments / (successfulPayments + failedPayments)

  // Metadata
  updatedAt: Date;
}

/**
 * Daily metrics aggregated by store and menu
 * Collection: metrics_daily_store_menu
 */
export interface MetricsDailyStoreMenu {
  _id?: string;
  storeId: string;
  storeName?: string;
  menuId: string;
  menuName: string;
  date: Date;

  // Menu-specific metrics
  quantity: number; // Total quantity sold
  revenue: number; // Total revenue from this menu
  orderCount: number; // Number of orders containing this menu

  // Metadata
  updatedAt: Date;
}

/**
 * Hourly metrics aggregated by store (for heatmap analysis)
 * Collection: metrics_hourly_store (optional)
 */
export interface MetricsHourlyStore {
  _id?: string;
  storeId: string;
  datetime: Date; // Hour precision (YYYY-MM-DD HH:00:00)
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday = 0)

  gmv: number;
  orderCount: number;

  updatedAt: Date;
}

/**
 * Query filter for metrics APIs
 */
export interface MetricsFilter {
  startDate: Date;
  endDate: Date;
  storeIds?: string[]; // If empty, fetch all stores
  limit?: number;
}

/**
 * Dashboard KPI response
 */
export interface DashboardKPI {
  // Total metrics
  totalGMV: number;
  totalPaidAmount: number;
  totalOrders: number;
  avgOrderValue: number;
  activeStores: number;
  paymentSuccessRate: number;

  // Time series data
  dailyMetrics: Array<{
    date: string;
    gmv: number;
    paidAmount: number;
    orders: number;
  }>;

  // Top stores
  topStoresByGMV: Array<{
    storeId: string;
    storeName: string;
    gmv: number;
    orders: number;
  }>;

  // Top menus
  topMenusByQuantity: Array<{
    menuId: string;
    menuName: string;
    quantity: number;
    revenue: number;
  }>;

  topMenusByRevenue: Array<{
    menuId: string;
    menuName: string;
    revenue: number;
    quantity: number;
  }>;
}

/**
 * Aggregation job status
 */
export interface AggregationJob {
  _id?: string;
  jobType: 'daily_store' | 'daily_store_menu' | 'hourly_store';
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
