/**
 * Check existing indexes on bills collection
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getDb } from '../lib/mongodb';

async function checkIndexes() {
  try {
    const db = await getDb();
    const billsCollection = db.collection('bills');

    console.log('=== Bills Collection Indexes ===\n');

    const indexes = await billsCollection.indexes();

    console.log(`Total indexes: ${indexes.length}\n`);

    indexes.forEach((index, i) => {
      console.log(`Index ${i + 1}:`);
      console.log(`  Name: ${index.name}`);
      console.log(`  Keys: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`  Unique: true`);
      if (index.sparse) console.log(`  Sparse: true`);
      if (index.background) console.log(`  Background: true`);
      console.log('');
    });

    // Check collection stats
    const stats = await db.command({ collStats: 'bills' });
    console.log('=== Collection Stats ===');
    console.log(`Documents: ${stats.count.toLocaleString()}`);
    console.log(`Storage Size: ${(stats.storageSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkIndexes();
