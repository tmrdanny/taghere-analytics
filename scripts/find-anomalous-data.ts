#!/usr/bin/env tsx

/**
 * 이상한 금액 데이터 찾기
 * resultPrice나 totalPrice가 비정상적으로 큰 경우 감지
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getReadOnlyDb } from '../lib/mongodb';

config({ path: resolve(process.cwd(), '.env.local') });

async function findAnomalousData() {
  try {
    const db = await getReadOnlyDb();
    const billsCollection = db.collection('bills');

    console.log('\n[이상 데이터 검색]\n');

    // resultPrice가 문자열이고 비정상적으로 큰 경우 찾기
    const anomalous = await billsCollection
      .find({
        $or: [
          // resultPrice가 10글자 이상인 경우 (정상은 보통 5-8글자)
          { resultPrice: { $regex: '^[0-9]{10,}$' } },
          // 금액이 없거나 '0'인 경우
          { resultPrice: { $in: ['', '0', null] } }
        ]
      })
      .limit(20)
      .toArray();

    console.log(`발견된 이상 데이터: ${anomalous.length}개\n`);

    if (anomalous.length === 0) {
      console.log('✓ 이상한 데이터가 없습니다.\n');
      process.exit(0);
    }

    for (const bill of anomalous) {
      console.log(`ID: ${bill._id}`);
      console.log(`날짜: ${bill.date || bill.dateOnly}`);
      console.log(`금액: ${bill.resultPrice}`);
      console.log(`storeId: ${bill.storeOID}`);
      console.log('---');
    }

    console.log(`\n[MongoDB Compass 삭제 방법]\n`);
    console.log('1. Compass를 열고 bills 컬렉션 접속');
    console.log('2. Filter 입력창에 다음 쿼리 입력:');
    console.log(`   { "resultPrice": { "$regex": "^[0-9]{10,}$" } }`);
    console.log('3. 결과 확인 후 마우스 우클릭 → Delete');
    console.log('4. 또는 선택한 문서 → 휴지통 아이콘 클릭\n');

    process.exit(0);
  } catch (error) {
    console.error('[오류]', error);
    process.exit(1);
  }
}

findAnomalousData();
