#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { getReadOnlyDb } from '../lib/mongodb';
import { format, subDays } from 'date-fns';

config({ path: resolve(process.cwd(), '.env.local') });

async function debugCrossSelling() {
  try {
    const db = await getReadOnlyDb();
    const billsCollection = db.collection('bills');

    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // 정확한 쿼리 재현
    const bills = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] }
        }
      },
      {
        $match: {
          dateOnly: { $gte: startDateStr, $lte: endDateStr }
        }
      },
      {
        $project: {
          items: 1,
        }
      },
      {
        $limit: 20
      }
    ]).toArray();

    console.log(`\n[디버그] 샘플 ${bills.length}개 주문 분석:\n`);

    let totalPairs = 0;
    let successCount = 0;
    let errorCount = 0;

    const coOccurrenceMap = new Map<string, number>();

    for (const bill of bills) {
      try {
        const items = JSON.parse(bill.items);
        if (!Array.isArray(items)) {
          console.log(`⚠️  items가 배열이 아님: ${typeof items}`);
          errorCount++;
          continue;
        }

        const menuLabels = items.map((i: any) => i.label).filter(Boolean);
        console.log(`  주문: ${menuLabels.join(' + ')} (${menuLabels.length}개)`);

        const uniqueLabels = [...new Set(menuLabels)];
        console.log(`  -> 고유 메뉴: ${uniqueLabels.join(' + ')} (${uniqueLabels.length}개)`);

        // Count pairs
        for (let i = 0; i < uniqueLabels.length; i++) {
          for (let j = i + 1; j < uniqueLabels.length; j++) {
            const pair = [uniqueLabels[i], uniqueLabels[j]].sort().join('|||');
            coOccurrenceMap.set(pair, (coOccurrenceMap.get(pair) || 0) + 1);
            totalPairs++;
          }
        }

        successCount++;
      } catch (e: any) {
        console.log(`  ❌ 파싱 오류: ${e.message}`);
        errorCount++;
      }
    }

    console.log(`\n통계:`);
    console.log(`  성공: ${successCount}, 실패: ${errorCount}`);
    console.log(`  생성된 페어: ${totalPairs}개`);
    console.log(`  고유 페어: ${coOccurrenceMap.size}개`);

    if (coOccurrenceMap.size > 0) {
      console.log(`\n상위 페어:`);
      const sorted = Array.from(coOccurrenceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [pair, count] of sorted) {
        const [m1, m2] = pair.split('|||');
        console.log(`  ${m1} <-> ${m2}: ${count}회`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('[오류]', error);
    process.exit(1);
  }
}

debugCrossSelling();
