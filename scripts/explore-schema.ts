/**
 * Schema exploration script
 * This script explores the actual MongoDB schema and generates the correct aggregation pipeline
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getDb } from '../lib/mongodb';
import { exploreCollection } from '../lib/schema-explorer';

async function exploreSchema() {
  try {
    const db = await getDb();

    console.log('=== Exploring MongoDB Schema ===\n');

    // Get collection names from env
    const billsCollection = process.env.COLLECTION_ORDERS || 'bills';
    const storesCollection = process.env.COLLECTION_MENUS || 'stores';

    console.log(`📦 Bills Collection: ${billsCollection}`);
    const billsSchema = await exploreCollection(db, billsCollection, 50);

    console.log('\n=== Bills Collection Schema ===');
    console.log(`Documents: ${billsSchema.documentCount.toLocaleString()}`);
    console.log(`\nFields found:`);

    const billsFields = Array.from(billsSchema.fields.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    billsFields.forEach(field => {
      const types = Array.from(field.types).join(' | ');
      const samples = field.sampleValues.slice(0, 2).map(v =>
        typeof v === 'object' ? JSON.stringify(v) : String(v)
      );
      console.log(`  - ${field.name}: ${types}`);
      if (samples.length > 0) {
        console.log(`    Example: ${samples.join(', ')}`);
      }
    });

    console.log(`\n\n📦 Stores Collection: ${storesCollection}`);
    const storesSchema = await exploreCollection(db, storesCollection, 20);

    console.log('\n=== Stores Collection Schema ===');
    console.log(`Documents: ${storesSchema.documentCount.toLocaleString()}`);
    console.log(`\nFields found:`);

    const storesFields = Array.from(storesSchema.fields.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    storesFields.forEach(field => {
      const types = Array.from(field.types).join(' | ');
      const samples = field.sampleValues.slice(0, 2).map(v =>
        typeof v === 'object' ? JSON.stringify(v) : String(v)
      );
      console.log(`  - ${field.name}: ${types}`);
      if (samples.length > 0) {
        console.log(`    Example: ${samples.join(', ')}`);
      }
    });

    console.log('\n\n=== Field Mapping Suggestions ===');
    console.log('\nFor Bills Collection:');

    // Analyze bills collection for required fields
    const requiredFields = {
      storeId: findBestMatch(billsFields, ['storeId', 'store_id', 'store', 'shopId', 'shop_id']),
      createdAt: findBestMatch(billsFields, ['createdAt', 'created_at', 'orderDate', 'date', 'timestamp', 'paidAt', 'paid_at']),
      totalAmount: findBestMatch(billsFields, ['totalAmount', 'total_amount', 'amount', 'price', 'total', 'totalPrice', 'finalAmount']),
      status: findBestMatch(billsFields, ['status', 'state', 'orderStatus', 'paymentStatus']),
      items: findBestMatch(billsFields, ['items', 'products', 'orderItems', 'lineItems', 'menus']),
      storeName: findBestMatch(billsFields, ['storeName', 'store_name', 'shopName', 'shop_name']),
    };

    console.log('Detected field mappings:');
    Object.entries(requiredFields).forEach(([expected, actual]) => {
      console.log(`  ${expected} → ${actual?.name || 'NOT FOUND'}`);
      if (actual) {
        console.log(`    Type: ${Array.from(actual.types).join(' | ')}`);
        console.log(`    Sample: ${actual.sampleValues[0]}`);
      }
    });

    console.log('\n✅ Schema exploration complete!');
    console.log('\nNext steps:');
    console.log('1. Review the field mappings above');
    console.log('2. The aggregation pipeline will be auto-generated based on these mappings');

    process.exit(0);
  } catch (error: any) {
    console.error('Error exploring schema:', error.message);
    process.exit(1);
  }
}

function findBestMatch(fields: any[], candidates: string[]): any | null {
  for (const candidate of candidates) {
    const match = fields.find(f =>
      f.name.toLowerCase() === candidate.toLowerCase() ||
      f.name.toLowerCase().includes(candidate.toLowerCase())
    );
    if (match) return match;
  }
  return null;
}

exploreSchema();
