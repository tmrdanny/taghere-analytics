#!/usr/bin/env node

/**
 * Validate SQLite cache file has data
 * Usage: node scripts/validate-cache.js [path-to-cache.db]
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.argv[2] || process.env.SQLITE_DB_PATH || '/data/cache.db';

console.log(`Validating cache file: ${dbPath}`);

// Check file exists
if (!fs.existsSync(dbPath)) {
  console.error('ERROR: Cache file does not exist');
  process.exit(1);
}

// Check file size
const stats = fs.statSync(dbPath);
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

if (stats.size === 0) {
  console.error('ERROR: Cache file is empty');
  process.exit(1);
}

try {
  const db = new Database(dbPath, { readonly: true });

  // Check tables exist
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((t) => t.name);
  console.log('Tables:', tables.join(', '));

  // Check record counts
  const dailyStoreCount = db
    .prepare('SELECT COUNT(*) as count FROM metrics_daily_store')
    .get();
  const dailyMenuCount = db
    .prepare('SELECT COUNT(*) as count FROM metrics_daily_store_menu')
    .get();
  const hourlyCount = db
    .prepare('SELECT COUNT(*) as count FROM metrics_hourly_store')
    .get();

  console.log(`metrics_daily_store: ${dailyStoreCount.count} records`);
  console.log(`metrics_daily_store_menu: ${dailyMenuCount.count} records`);
  console.log(`metrics_hourly_store: ${hourlyCount.count} records`);

  // Check date range
  const dateRange = db
    .prepare(
      'SELECT MIN(date) as minDate, MAX(date) as maxDate FROM metrics_daily_store'
    )
    .get();
  console.log(`Date range: ${dateRange.minDate} to ${dateRange.maxDate}`);

  db.close();

  if (dailyStoreCount.count === 0) {
    console.error('ERROR: No data in metrics_daily_store');
    process.exit(1);
  }

  console.log('\nCache validation: PASSED');
  process.exit(0);
} catch (err) {
  console.error('ERROR: Failed to read SQLite database');
  console.error(err.message);
  process.exit(1);
}
