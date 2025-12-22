#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { getReadOnlyDb } from '../lib/mongodb';
import { format, subDays } from 'date-fns';

config({ path: resolve(process.cwd(), '.env.local') });

async function analyzeCrossSellingFrequency() {
  try {
    const db = await getReadOnlyDb();
    const billsCollection = db.collection('bills');

    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    console.log(`\n[분석] 기간: ${startDateStr} ~ ${endDateStr}\n`);

    // 모든 주문 처리
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
      }
    ]).toArray();

    console.log(`총 ${bills.length}개 주문 분석 중...\n`);

    const coOccurrenceMap = new Map<string, number>();
    const menuCounts = new Map<string, number>();
    let errorCount = 0;

    for (const bill of bills) {
      try {
        const items = JSON.parse(bill.items);
        if (!Array.isArray(items)) continue;

        const menuLabels = items.map((i: any) => i.label).filter(Boolean);

        for (const label of menuLabels) {
          menuCounts.set(label, (menuCounts.get(label) || 0) + 1);
        }

        const uniqueLabels = [...new Set(menuLabels)];
        for (let i = 0; i < uniqueLabels.length; i++) {
          for (let j = i + 1; j < uniqueLabels.length; j++) {
            const pair = [uniqueLabels[i], uniqueLabels[j]].sort().join('|||');
            coOccurrenceMap.set(pair, (coOccurrenceMap.get(pair) || 0) + 1);
          }
        }
      } catch (e) {
        errorCount++;
      }
    }

    console.log(`결과:`);
    console.log(`  전체 페어: ${coOccurrenceMap.size}개`);
    console.log(`  파싱 오류: ${errorCount}개\n`);

    // 빈도가 높은 페어 찾기
    const frequent = Array.from(coOccurrenceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count >= 2)
      .slice(0, 20);

    console.log(`빈도 2회 이상 페어 (${frequent.length}개):\n`);

    if (frequent.length === 0) {
      console.log('  ⚠️  2회 이상 반복되는 페어가 없습니다.');
      console.log('\n상위 페어 (모두 1회):');

      const top10 = Array.from(coOccurrenceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [pair, count] of top10) {
        const [m1, m2] = pair.split('|||');
        console.log(`  ${m1} <-> ${m2}: ${count}회`);
      }
    } else {
      for (const [pair, count] of frequent) {
        const [m1, m2] = pair.split('|||');
        const menu1Count = menuCounts.get(m1) || 0;
        const confidence = (count / menu1Count * 100).toFixed(1);
        console.log(`  ${m1} <-> ${m2}: ${count}회 (${confidence}%)`);
      }
    }

    // 가장 인기 있는 메뉴
    console.log(`\n상위 메뉴:`);
    const topMenus = Array.from(menuCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [menu, count] of topMenus) {
      console.log(`  ${menu}: ${count}회`);
    }

    process.exit(0);
  } catch (error) {
    console.error('[오류]', error);
    process.exit(1);
  }
}

analyzeCrossSellingFrequency();
