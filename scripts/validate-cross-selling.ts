#!/usr/bin/env tsx

/**
 * 교차판매 데이터 검증 스크립트
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getReadOnlyDb } from '../lib/mongodb';
import { format, subDays } from 'date-fns';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function validateCrossSelling() {
  try {
    const db = await getReadOnlyDb();
    const billsCollection = db.collection('bills');

    // Last 30 days
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    console.log(`\n[검증] 기간: ${startDateStr} ~ ${endDateStr}\n`);

    // 샘플 주문 조회
    const sampleBills = await billsCollection
      .find({
        dateOnly: { $gte: startDateStr, $lte: endDateStr }
      })
      .project({ items: 1, date: 1, dateOnly: 1 })
      .limit(5)
      .toArray();

    console.log('샘플 주문 데이터:');
    for (const bill of sampleBills) {
      try {
        const items = JSON.parse(bill.items);
        const labels = items.map((i: any) => i.label).filter(Boolean);
        console.log(`  - 날짜: ${bill.dateOnly}, 메뉴 ${labels.length}개: ${labels.join(', ')}`);
      } catch (e) {
        console.log(`  - 파싱 오류`);
      }
    }

    // 전체 통계
    const stats = await billsCollection.aggregate([
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
        $facet: {
          total: [{ $count: 'count' }],
          itemsStats: [
            {
              $project: {
                itemCount: {
                  $size: { $ifNull: [{ $split: [{ $ifNull: ['$items', '[]'] }, ','] }, []] }
                }
              }
            },
            {
              $group: {
                _id: null,
                avgItems: { $avg: '$itemCount' },
                maxItems: { $max: '$itemCount' },
                minItems: { $min: '$itemCount' }
              }
            }
          ]
        }
      }
    ]).toArray();

    const totalBills = stats[0].total[0]?.count || 0;
    const itemStats = stats[0].itemsStats[0];

    console.log(`\n통계:`);
    console.log(`  총 주문 수: ${totalBills}`);
    if (itemStats) {
      console.log(`  평균 메뉴/주문: ${itemStats.avgItems?.toFixed(1) || 'N/A'}`);
      console.log(`  최대 메뉴/주문: ${itemStats.maxItems || 'N/A'}`);
      console.log(`  최소 메뉴/주문: ${itemStats.minItems || 'N/A'}`);
    }

    // 여러 메뉴를 주문한 건만 조회
    console.log(`\n여러 메뉴를 주문한 주문 샘플:`);
    
    const multiMenuBills = await billsCollection.aggregate([
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
          itemCount: {
            $size: { $ifNull: [{ $split: [{ $ifNull: ['$items', '[]'] }, ','] }, []] }
          }
        }
      },
      {
        $match: {
          itemCount: { $gte: 2 }
        }
      },
      {
        $limit: 10
      }
    ]).toArray();

    for (const bill of multiMenuBills) {
      try {
        const items = JSON.parse(bill.items);
        const labels = items.map((i: any) => i.label).filter(Boolean);
        console.log(`  ${labels.join(' + ')}`);
      } catch (e) {
        console.log(`  파싱 오류`);
      }
    }

    console.log('\n✓ 검증 완료\n');
    process.exit(0);
  } catch (error) {
    console.error('[오류]', error);
    process.exit(1);
  }
}

validateCrossSelling();
