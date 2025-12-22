#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { getReadOnlyDb } from '../lib/mongodb';

config({ path: resolve(process.cwd(), '.env.local') });

async function checkStoreIdFormat() {
  try {
    const db = await getReadOnlyDb();
    const billsCollection = db.collection('bills');

    // 샘플 문서 조회
    const samples = await billsCollection.find({}).limit(3).toArray();

    console.log('\n[StoreID 형식 확인]\n');

    for (const bill of samples) {
      console.log(`storeOID 타입: ${typeof bill.storeOID}`);
      console.log(`storeOID 값: ${bill.storeOID}`);
      console.log(`storeOID toString: ${bill.storeOID?.toString()}`);
      console.log('---');
    }

    process.exit(0);
  } catch (error) {
    console.error('[오류]', error);
    process.exit(1);
  }
}

checkStoreIdFormat();
