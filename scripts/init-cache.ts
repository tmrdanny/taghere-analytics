/**
 * Initialize SQLite cache database
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getDb } from '../lib/cache/sqlite';

async function initCache() {
  try {
    console.log('=== Initializing SQLite Cache ===\n');

    // This will create the database and tables
    const db = getDb();

    console.log('\n✅ SQLite cache initialized successfully');
    console.log('\nNext steps:');
    console.log('1. Run: npm run cache:refresh');
    console.log('2. Or call: POST /api/refresh-cache\n');

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initCache();
