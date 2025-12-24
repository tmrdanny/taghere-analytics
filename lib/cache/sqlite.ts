/**
 * SQLite cache database initialization and operations
 * Stores pre-aggregated metrics for fast dashboard queries
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

let db: Database.Database | null = null;

/**
 * Get or create SQLite database connection
 */
export function getDb(): Database.Database {
  if (db) return db;

  // Use /tmp for serverless environments (Render, Vercel, etc.)
  const defaultPath = process.env.NODE_ENV === 'production'
    ? '/tmp/cache.db'
    : resolve(process.cwd(), 'data/cache.db');
  const dbPath = process.env.SQLITE_DB_PATH || defaultPath;

  // Ensure directory exists
  const fs = require('fs');
  const dir = require('path').dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  console.log(`[SQLite] Connected to ${dbPath}`);

  initializeTables();

  return db;
}

/**
 * Initialize database tables
 */
function initializeTables() {
  if (!db) throw new Error('Database not initialized');

  // Create metrics_daily_store table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_daily_store (
      storeId TEXT NOT NULL,
      storeName TEXT,
      date TEXT NOT NULL,
      gmv REAL NOT NULL,
      paidAmount REAL NOT NULL,
      orderCount INTEGER NOT NULL,
      avgOrderValue REAL NOT NULL,
      successfulPayments INTEGER NOT NULL,
      failedPayments INTEGER NOT NULL,
      paymentSuccessRate REAL NOT NULL,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (storeId, date)
    );
  `);

  // Create index for date-based queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_store_date
    ON metrics_daily_store(date);
  `);

  // Create metrics_daily_store_menu table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_daily_store_menu (
      storeId TEXT NOT NULL,
      storeName TEXT,
      menuId TEXT NOT NULL,
      menuName TEXT,
      date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      revenue REAL NOT NULL,
      orderCount INTEGER NOT NULL,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (storeId, menuId, date)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_menu_date
    ON metrics_daily_store_menu(date);
  `);

  // Create metrics_hourly_store table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_hourly_store (
      storeId TEXT NOT NULL,
      datetime TEXT NOT NULL,
      hour INTEGER NOT NULL,
      dayOfWeek INTEGER NOT NULL,
      gmv REAL NOT NULL,
      orderCount INTEGER NOT NULL,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (storeId, datetime)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hourly_datetime
    ON metrics_hourly_store(datetime);
  `);

  console.log('[SQLite] Tables initialized');
}

/**
 * Insert or replace daily store metrics
 */
export function upsertDailyStoreMetrics(metrics: any[]) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO metrics_daily_store (
      storeId, storeName, date, gmv, paidAmount, orderCount,
      avgOrderValue, successfulPayments, failedPayments,
      paymentSuccessRate, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insert = db.transaction((metricsArray: any[]) => {
    for (const m of metricsArray) {
      stmt.run(
        String(m.storeId),
        m.storeName || 'Unknown Store',
        m.date,
        m.gmv || 0,
        m.paidAmount || 0,
        m.orderCount || 0,
        m.avgOrderValue || 0,
        m.successfulPayments || 0,
        m.failedPayments || 0,
        m.paymentSuccessRate || 0,
        m.updatedAt || new Date().toISOString()
      );
    }
  });

  insert(metrics);

  console.log(`[SQLite] Upserted ${metrics.length} daily store metrics`);
}

/**
 * Insert or replace daily store-menu metrics
 */
export function upsertDailyStoreMenuMetrics(metrics: any[]) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO metrics_daily_store_menu (
      storeId, storeName, menuId, menuName, date,
      quantity, revenue, orderCount, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insert = db.transaction((metricsArray: any[]) => {
    for (const m of metricsArray) {
      stmt.run(
        String(m.storeId),
        m.storeName || 'Unknown Store',
        m.menuId || 'unknown',
        m.menuName || 'Unknown Menu',
        m.date,
        m.quantity || 0,
        m.revenue || 0,
        m.orderCount || 0,
        m.updatedAt || new Date().toISOString()
      );
    }
  });

  insert(metrics);

  console.log(`[SQLite] Upserted ${metrics.length} daily store-menu metrics`);
}

/**
 * Insert or replace hourly store metrics
 */
export function upsertHourlyStoreMetrics(metrics: any[]) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO metrics_hourly_store (
      storeId, datetime, hour, dayOfWeek, gmv, orderCount, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insert = db.transaction((metricsArray: any[]) => {
    for (const m of metricsArray) {
      stmt.run(
        String(m.storeId),
        m.datetime,
        m.hour || 0,
        m.dayOfWeek || 0,
        m.gmv || 0,
        m.orderCount || 0,
        m.updatedAt || new Date().toISOString()
      );
    }
  });

  insert(metrics);

  console.log(`[SQLite] Upserted ${metrics.length} hourly store metrics`);
}

/**
 * Query daily store metrics
 */
export function queryDailyStoreMetrics(startDate: string, endDate: string, storeIds?: string[]) {
  const db = getDb();

  let sql = `
    SELECT * FROM metrics_daily_store
    WHERE date >= ? AND date <= ?
  `;

  const params: any[] = [startDate, endDate];

  if (storeIds && storeIds.length > 0) {
    const placeholders = storeIds.map(() => '?').join(',');
    sql += ` AND storeId IN (${placeholders})`;
    params.push(...storeIds);
  }

  sql += ` ORDER BY date ASC`;

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Query daily store-menu metrics
 */
export function queryDailyStoreMenuMetrics(startDate: string, endDate: string, storeIds?: string[]) {
  const db = getDb();

  let sql = `
    SELECT * FROM metrics_daily_store_menu
    WHERE date >= ? AND date <= ?
  `;

  const params: any[] = [startDate, endDate];

  if (storeIds && storeIds.length > 0) {
    const placeholders = storeIds.map(() => '?').join(',');
    sql += ` AND storeId IN (${placeholders})`;
    params.push(...storeIds);
  }

  return db.prepare(sql).all(...params);
}

/**
 * Query hourly store metrics
 */
export function queryHourlyStoreMetrics(startDate: string, endDate: string, storeIds?: string[]) {
  const db = getDb();

  let sql = `
    SELECT * FROM metrics_hourly_store
    WHERE datetime >= ? AND datetime <= ?
  `;

  const params: any[] = [startDate, endDate];

  if (storeIds && storeIds.length > 0) {
    const placeholders = storeIds.map(() => '?').join(',');
    sql += ` AND storeId IN (${placeholders})`;
    params.push(...storeIds);
  }

  return db.prepare(sql).all(...params);
}

/**
 * Get store names by store IDs
 * Returns a Map of storeId -> storeName
 */
export function getStoreNames(storeIds: string[]): Map<string, string> {
  const db = getDb();
  const storeNames = new Map<string, string>();

  if (storeIds.length === 0) return storeNames;

  const placeholders = storeIds.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT storeId, storeName
    FROM metrics_daily_store
    WHERE storeId IN (${placeholders})
  `;

  const rows = db.prepare(sql).all(...storeIds) as Array<{ storeId: string; storeName: string }>;

  for (const row of rows) {
    if (row.storeName && row.storeName !== 'Unknown Store') {
      storeNames.set(row.storeId, row.storeName);
    }
  }

  return storeNames;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const db = getDb();

  const dailyStoreCount = db.prepare('SELECT COUNT(*) as count FROM metrics_daily_store').get() as { count: number };
  const dailyMenuCount = db.prepare('SELECT COUNT(*) as count FROM metrics_daily_store_menu').get() as { count: number };
  const hourlyCount = db.prepare('SELECT COUNT(*) as count FROM metrics_hourly_store').get() as { count: number };

  const dateRange = db.prepare(`
    SELECT
      MIN(date) as minDate,
      MAX(date) as maxDate
    FROM metrics_daily_store
  `).get() as { minDate: string | null; maxDate: string | null };

  return {
    dailyStoreRecords: dailyStoreCount.count,
    dailyMenuRecords: dailyMenuCount.count,
    hourlyRecords: hourlyCount.count,
    dateRange: dateRange.minDate && dateRange.maxDate ? {
      min: dateRange.minDate,
      max: dateRange.maxDate
    } : null
  };
}

/**
 * Close database connection
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('[SQLite] Connection closed');
  }
}
